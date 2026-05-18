import { createFileRoute, Navigate } from "@tanstack/react-router";

// A página de Reuniões de Campo foi unificada com as demais reuniões
// dentro do pacote "Reuniões e Discursos".
export const Route = createFileRoute("/_app/reunioes-de-campo")({
  component: () => <Navigate to="/reunioes-discursos" replace />,
});
