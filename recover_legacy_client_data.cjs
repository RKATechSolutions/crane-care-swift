const { createClient } = require("@supabase/supabase-js");

/**
 * Usage:
 *   OLD_SUPABASE_URL=... OLD_SUPABASE_ANON_KEY=... NEW_SUPABASE_URL=... NEW_SUPABASE_SERVICE_ROLE_KEY=... \
 *   CLIENT_ID=uuid node recover_legacy_client_data.cjs
 *
 * Or:
 *   ... CLIENT_NAME_LIKE=aline node recover_legacy_client_data.cjs
 *
 * Notes:
 * - This script is backfill-only: it inserts missing rows and fills empty fields.
 * - It materializes legacy data:image/* payloads into current storage URLs.
 */

const requiredEnv = [
  "OLD_SUPABASE_URL",
  "OLD_SUPABASE_ANON_KEY",
  "NEW_SUPABASE_URL",
  "NEW_SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const oldDb = createClient(
  process.env.OLD_SUPABASE_URL,
  process.env.OLD_SUPABASE_ANON_KEY,
);
const newDb = createClient(
  process.env.NEW_SUPABASE_URL,
  process.env.NEW_SUPABASE_SERVICE_ROLE_KEY,
);

const STORAGE_BUCKET = "job-documents";

function asString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return !(s === "" || s === "null" || s === "undefined" || s === "[]" || s === "{}");
}

function parsePhotoList(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  const s = String(value).trim();
  if (!s || s === "[]" || s === "{}" || s === "null") return [];

  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // fall through to scalar handling
    }
  }
  return [s];
}

function extFromMime(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

async function uploadBytes(bytes, contentType, pathNoExt) {
  const ext = extFromMime(contentType);
  const fullPath = `${pathNoExt}.${ext}`;
  const { error } = await newDb.storage.from(STORAGE_BUCKET).upload(fullPath, bytes, {
    contentType: contentType || "image/jpeg",
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;
  return newDb.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath).data.publicUrl;
}

async function materializeImageRef(ref, pathNoExt) {
  if (!isMeaningful(ref)) return null;
  const s = String(ref);

  if (s.startsWith("data:image")) {
    const m = s.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) return null;
    const mime = m[1] || "image/jpeg";
    const bytes = Buffer.from(m[2], "base64");
    return uploadBytes(bytes, mime, pathNoExt);
  }

  if (s.startsWith("http")) {
    const res = await fetch(s);
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    return uploadBytes(bytes, res.headers.get("content-type"), pathNoExt);
  }

  return null;
}

async function fetchAll(sb, table, select, apply) {
  const rows = [];
  const page = 1000;
  let offset = 0;
  while (true) {
    let query = sb.from(table).select(select).range(offset, offset + page - 1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  return rows;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function resolveClientId() {
  if (process.env.CLIENT_ID) return process.env.CLIENT_ID;

  const like = process.env.CLIENT_NAME_LIKE;
  if (!like) {
    throw new Error("Provide either CLIENT_ID or CLIENT_NAME_LIKE");
  }

  const { data, error } = await newDb
    .from("clients")
    .select("id,client_name")
    .ilike("client_name", `%${like}%`)
    .limit(5);
  if (error) throw error;
  if (!data?.length) throw new Error(`No clients matched CLIENT_NAME_LIKE=${like}`);
  if (data.length > 1) {
    console.log("Multiple client matches; using first result:", data);
  }
  return data[0].id;
}

async function main() {
  const clientId = await resolveClientId();
  const summary = {
    clientId,
    inspectionsInserted: 0,
    responsesInserted: 0,
    responsesUpdated: 0,
    responsePhotosRecovered: 0,
    liftingPhotosRecovered: 0,
    liftingRowsUpdated: 0,
    warnings: [],
  };

  // ---- DB inspections + response backfill ----
  const oldInspections = await fetchAll(oldDb, "db_inspections", "*", (q) => q.eq("client_id", clientId));
  const newInspections = await fetchAll(newDb, "db_inspections", "*", (q) => q.eq("client_id", clientId));
  const newInspectionMap = new Map(newInspections.map((r) => [r.id, r]));

  for (const row of oldInspections) {
    if (newInspectionMap.has(row.id)) continue;
    const { error } = await newDb.from("db_inspections").insert(row);
    if (error) summary.warnings.push(`inspection insert ${row.id}: ${error.message}`);
    else summary.inspectionsInserted++;
  }

  const oldInspectionIds = oldInspections.map((r) => r.id);
  const oldResponses = await fetchAll(oldDb, "inspection_responses", "*", (q) =>
    q.in("inspection_id", oldInspectionIds),
  );
  const newResponses = await fetchAll(newDb, "inspection_responses", "*", (q) =>
    q.in("inspection_id", oldInspectionIds),
  );
  const responseKey = (r) => `${r.inspection_id}::${r.question_id}`;
  const newResponseMap = new Map(newResponses.map((r) => [responseKey(r), r]));

  for (const oldRow of oldResponses) {
    const key = responseKey(oldRow);
    const current = newResponseMap.get(key);

    // Recover any old photo refs as actual URLs in the current storage bucket.
    const oldPhotoRefs = parsePhotoList(oldRow.photo_urls);
    const recoveredPhotoUrls = [];
    for (let i = 0; i < oldPhotoRefs.length; i++) {
      try {
        const recovered = await materializeImageRef(
          oldPhotoRefs[i],
          `inspections/${oldRow.question_id}/recovered_${oldRow.inspection_id}_${i}_${Date.now()}`,
        );
        if (recovered) recoveredPhotoUrls.push(recovered);
      } catch (err) {
        summary.warnings.push(`response photo ${key} idx=${i}: ${String(err.message || err)}`);
      }
    }
    const serializedPhotos = recoveredPhotoUrls.length
      ? JSON.stringify(recoveredPhotoUrls)
      : oldPhotoRefs.length
        ? JSON.stringify(oldPhotoRefs)
        : "[]";

    if (!current) {
      const insertRow = {
        ...oldRow,
        photo_urls: serializedPhotos,
        defect_flag: asString(oldRow.defect_flag),
      };
      const { error } = await newDb.from("inspection_responses").insert(insertRow);
      if (error) summary.warnings.push(`response insert ${key}: ${error.message}`);
      else {
        summary.responsesInserted++;
        summary.responsePhotosRecovered += recoveredPhotoUrls.length;
      }
      continue;
    }

    const patch = {};
    let changed = false;

    if (isMeaningful(serializedPhotos) && !isMeaningful(current.photo_urls)) {
      patch.photo_urls = serializedPhotos;
      changed = true;
      summary.responsePhotosRecovered += recoveredPhotoUrls.length;
    }
    if (isMeaningful(oldRow.comment) && !isMeaningful(current.comment)) {
      patch.comment = asString(oldRow.comment);
      changed = true;
    }
    if (isMeaningful(oldRow.urgency) && !isMeaningful(current.urgency)) {
      patch.urgency = asString(oldRow.urgency);
      changed = true;
    }
    if (isMeaningful(oldRow.defect_types) && !isMeaningful(current.defect_types)) {
      patch.defect_types = asString(oldRow.defect_types);
      changed = true;
    }
    if (
      isMeaningful(oldRow.advanced_defect_detail) &&
      !isMeaningful(current.advanced_defect_detail)
    ) {
      patch.advanced_defect_detail = asString(oldRow.advanced_defect_detail);
      changed = true;
    }
    if (String(oldRow.defect_flag).toLowerCase() === "true" && String(current.defect_flag).toLowerCase() !== "true") {
      patch.defect_flag = "true";
      changed = true;
    }

    if (changed) {
      const { error } = await newDb.from("inspection_responses").update(patch).eq("id", current.id);
      if (error) summary.warnings.push(`response update ${key}: ${error.message}`);
      else summary.responsesUpdated++;
    }
  }

  // ---- Lifting register photo backfill ----
  const oldLite = await oldDb
    .from("lifting_register_lite")
    .select("id")
    .eq("client_id", clientId)
    .limit(500);
  if (oldLite.error) throw oldLite.error;
  const liftingIds = (oldLite.data || []).map((r) => r.id);

  const { data: newLiftingRows, error: newLiftErr } = await newDb
    .from("lifting_register")
    .select("id,overall_photo_url,tag_photo_url,stamp_photo_url")
    .eq("client_id", clientId);
  if (newLiftErr) throw newLiftErr;
  const newLiftMap = new Map((newLiftingRows || []).map((r) => [r.id, r]));

  for (const id of liftingIds) {
    const current = newLiftMap.get(id);
    if (!current) continue;

    const needOverall = !isMeaningful(current.overall_photo_url);
    const needTag = !isMeaningful(current.tag_photo_url);
    const needStamp = !isMeaningful(current.stamp_photo_url);
    if (!needOverall && !needTag && !needStamp) continue;

    const { data: oldFull, error } = await oldDb
      .from("lifting_register")
      .select("id,overall_photo_url,tag_photo_url,stamp_photo_url")
      .eq("id", id)
      .single();
    if (error) {
      summary.warnings.push(`old lifting read ${id}: ${error.message}`);
      continue;
    }

    const patch = {};
    let changed = false;

    if (needOverall && isMeaningful(oldFull.overall_photo_url)) {
      try {
        patch.overall_photo_url = await materializeImageRef(
          oldFull.overall_photo_url,
          `lifting-register/recovered_${id}_overall_${Date.now()}`,
        );
        if (patch.overall_photo_url) {
          changed = true;
          summary.liftingPhotosRecovered++;
        }
      } catch (err) {
        summary.warnings.push(`lifting overall ${id}: ${String(err.message || err)}`);
      }
    }
    if (needTag && isMeaningful(oldFull.tag_photo_url)) {
      try {
        patch.tag_photo_url = await materializeImageRef(
          oldFull.tag_photo_url,
          `lifting-register/recovered_${id}_tag_${Date.now()}`,
        );
        if (patch.tag_photo_url) {
          changed = true;
          summary.liftingPhotosRecovered++;
        }
      } catch (err) {
        summary.warnings.push(`lifting tag ${id}: ${String(err.message || err)}`);
      }
    }
    if (needStamp && isMeaningful(oldFull.stamp_photo_url)) {
      try {
        patch.stamp_photo_url = await materializeImageRef(
          oldFull.stamp_photo_url,
          `lifting-register/recovered_${id}_stamp_${Date.now()}`,
        );
        if (patch.stamp_photo_url) {
          changed = true;
          summary.liftingPhotosRecovered++;
        }
      } catch (err) {
        summary.warnings.push(`lifting stamp ${id}: ${String(err.message || err)}`);
      }
    }

    if (changed) {
      const { error: updateError } = await newDb.from("lifting_register").update(patch).eq("id", id);
      if (updateError) summary.warnings.push(`lifting update ${id}: ${updateError.message}`);
      else summary.liftingRowsUpdated++;
    }
  }

  console.log("RECOVERY SUMMARY");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.warnings.length) {
    console.log("\nWARNINGS");
    for (const w of summary.warnings) console.log("-", w);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

