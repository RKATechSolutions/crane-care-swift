
-- Add optional photo and comment columns to question_library
ALTER TABLE public.question_library
ADD COLUMN optional_photo boolean NOT NULL DEFAULT false,
ADD COLUMN optional_comment boolean NOT NULL DEFAULT false;
