ALTER TABLE public.program_templates DROP CONSTRAINT program_templates_slot_check;
ALTER TABLE public.program_templates ADD CONSTRAINT program_templates_slot_check CHECK (slot >= 1 AND slot <= 10);