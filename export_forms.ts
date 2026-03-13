import { createClient } from '@supabase/supabase-client';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function exportForm(formId: string, fileName: string) {
  console.log(`Exporting ${formId}...`);

  // Get form template
  const { data: formTemplate, error: formError } = await supabase
    .from('form_templates')
    .select('*')
    .eq('form_id', formId)
    .single();

  if (formError) {
    console.error(`Error fetching form template ${formId}:`, formError);
    return;
  }

  // Get bridge data
  const { data: bridgeData, error: bridgeError } = await supabase
    .from('form_template_questions')
    .select('*')
    .eq('form_id', formId)
    .order('override_sort_order');

  if (bridgeError) {
    console.error(`Error fetching bridge data for ${formId}:`, bridgeError);
    return;
  }

  const questionIds = bridgeData.map(b => b.question_id);

  // Get question library details
  const { data: questionData, error: questionError } = await supabase
    .from('question_library')
    .select('*')
    .in('question_id', questionIds);

  if (questionError) {
    console.error(`Error fetching questions for ${formId}:`, questionError);
    return;
  }

  // Merge them
  const questions = bridgeData.map(bridge => {
    const q = questionData.find(qd => qd.question_id === bridge.question_id);
    return {
      ...q,
      required: bridge.required,
      override_sort_order: bridge.override_sort_order,
      override_help_text: bridge.override_help_text,
      override_standard_ref: bridge.override_standard_ref,
      section_override: bridge.section_override,
      sub_heading: bridge.sub_heading,
      conditional_rule: bridge.conditional_rule
    };
  });

  const exportData = {
    formTemplate,
    questions
  };

  fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));
  console.log(`Saved to ${fileName}`);
}

async function main() {
  await exportForm('FORM-1', 'overhead_crane_form.json');
  await exportForm('FORM_JIB_V1', 'jib_crane_form.json');
}

main();
