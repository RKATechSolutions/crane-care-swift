#!/bin/bash

# Load .env
source .env

# Function to export form
export_form() {
  FORM_ID=$1
  FILE_NAME=$2

  echo "Exporting $FORM_ID to $FILE_NAME..."

  # Get form template
  TEMPLATE=$(curl -s -X GET "$VITE_SUPABASE_URL/rest/v1/form_templates?form_id=eq.$FORM_ID&select=*" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

  # Get bridge data
  BRIDGE=$(curl -s -X GET "$VITE_SUPABASE_URL/rest/v1/form_template_questions?form_id=eq.$FORM_ID&select=*&order=override_sort_order" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

  # Extract question IDs
  QUESTION_IDS=$(echo "$BRIDGE" | jq -r '.[].question_id' | paste -sd "," -)

  # Get question library details
  QUESTIONS=$(curl -s -X GET "$VITE_SUPABASE_URL/rest/v1/question_library?question_id=in.($QUESTION_IDS)&select=*" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

  # Merge them using jq
  # We want to map each bridge record to its question details
  FINAL_DATA=$(jq -n \
    --argjson template "$TEMPLATE" \
    --argjson bridge "$BRIDGE" \
    --argjson questions "$QUESTIONS" \
    '{
      formTemplate: $template[0],
      questions: [
        $bridge[] as $b |
        ($questions[] | select(.question_id == $b.question_id)) as $q |
        $q + {
          required: $b.required,
          override_sort_order: $b.override_sort_order,
          override_help_text: $b.override_help_text,
          override_standard_ref: $b.override_standard_ref,
          section_override: $b.section_override,
          sub_heading: $b.sub_heading,
          conditional_rule: $b.conditional_rule
        }
      ]
    }')

  echo "$FINAL_DATA" > "$FILE_NAME"
  echo "Exported $FORM_ID successfully."
}

export_form "FORM-1" "overhead_crane_form.json"
export_form "FORM_JIB_V1" "jib_crane_form.json"
