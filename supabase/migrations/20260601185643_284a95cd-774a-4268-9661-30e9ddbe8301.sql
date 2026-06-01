-- Ajuste 02: Remover campos SC do template Pioneer
ALTER TABLE public.meeting_talk_template_pioneer
  DROP COLUMN IF EXISTS super_meeting_weekday,
  DROP COLUMN IF EXISTS super_meeting_time;

-- Ajuste 03: Adicionar dia/horário ao template Anciãos
ALTER TABLE public.meeting_talk_template_elders
  ADD COLUMN IF NOT EXISTS weekday smallint,
  ADD COLUMN IF NOT EXISTS meeting_time time;