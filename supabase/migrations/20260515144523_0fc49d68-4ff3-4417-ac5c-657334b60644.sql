
ALTER TABLE public.schedule_events REPLICA IDENTITY FULL;
ALTER TABLE public.field_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.meals REPLICA IDENTITY FULL;
ALTER TABLE public.visits REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['schedule_events','field_assignments','meals','visits']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.checklist_items (visit_id, title, description, sort_order, status) VALUES
    (NEW.id, 'Confirmar datas e horários da visita', 'Alinhar com o superintendente as datas e o cronograma geral.', 10, 'pending'),
    (NEW.id, 'Reservar salão para reuniões', 'Garantir disponibilidade do Salão do Reino para todos os eventos.', 20, 'pending'),
    (NEW.id, 'Preparar designações da semana', 'Definir leitor, presidente, oração inicial/final e demais partes.', 30, 'pending'),
    (NEW.id, 'Organizar testemunho público', 'Definir locais, horários e participantes do testemunho público.', 40, 'pending'),
    (NEW.id, 'Coordenar pregação de casa em casa', 'Pontos de encontro, dirigentes, pilotos e acompanhantes.', 50, 'pending'),
    (NEW.id, 'Planejar refeições com o superintendente', 'Confirmar anfitriões, locais e horários das refeições.', 60, 'pending'),
    (NEW.id, 'Reservar acomodação (se necessário)', 'Confirmar hospedagem para o superintendente e esposa.', 70, 'pending'),
    (NEW.id, 'Reunião com o corpo de anciãos', 'Agendar e divulgar a reunião com o superintendente.', 80, 'pending'),
    (NEW.id, 'Reunião com pioneiros', 'Confirmar local, horário e lista de pioneiros.', 90, 'pending'),
    (NEW.id, 'Preparar discurso de serviço público', 'Divulgar tema, data e horário à congregação.', 100, 'pending'),
    (NEW.id, 'Atualizar relatórios da congregação', 'Secretário prepara relatórios e dados solicitados.', 110, 'pending'),
    (NEW.id, 'Comunicar a congregação', 'Anúncios das reuniões, horários e atividades especiais.', 120, 'pending');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_checklist ON public.visits;
CREATE TRIGGER trg_seed_default_checklist
AFTER INSERT ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.seed_default_checklist();
