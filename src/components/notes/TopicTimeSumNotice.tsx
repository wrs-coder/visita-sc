/**
 * Aviso discreto no modo edição quando a soma dos minutos dos tópicos
 * difere do tempo escolhido no cronômetro do esboço.
 */
import { useTranslation } from "react-i18next";
import { useOutlineTimer } from "@/hooks/use-outline-timer";
import { sumTopicMinutes } from "@/lib/outline-schedule";

export function TopicTimeSumNotice({ outlineId, html }: { outlineId: string; html: string }) {
  const { t } = useTranslation();
  const timer = useOutlineTimer(outlineId);
  const total = sumTopicMinutes(html);
  const target = Math.round(timer.targetSec / 60);
  if (total === 0 || !timer.targetChosen || total === target) return null;
  return (
    <p className="mb-2 rounded-md border border-timer-warn/40 px-3 py-1.5 text-xs text-muted-foreground" role="status">
      {t("personalOutlines.topicTime.sumMismatch", {
        total,
        target,
        defaultValue: "Os tópicos somam {{total}} min, mas o cronômetro está em {{target}} min.",
      })}
    </p>
  );
}
