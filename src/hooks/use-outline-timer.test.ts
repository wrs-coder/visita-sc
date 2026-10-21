import { describe, it, expect } from "vitest";
import {
  computeTickAdvance,
  alertLevelFor,
  formatMMSS,
  alertMilestoneFor,
  type TimerSnapshot,
} from "./use-outline-timer";

/**
 * Regressão do cronômetro (Onda 7.14).
 *
 * Bug corrigido anteriormente: montar múltiplas instâncias do hook
 * (toolbar + banner fullscreen + sensor) fazia cada `setInterval`
 * somar +1 independente, acelerando o cronômetro N vezes.
 *
 * A correção foi mover o tick para uma função pura baseada em
 * `Date.now() - lastTickAt`. Estes testes travam esse contrato.
 */

function baseSnap(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return {
    mode: "countdown",
    targetSec: 30 * 60,
    elapsedSec: 0,
    isRunning: true,
    lastTickAt: 1_000_000,
    ...overrides,
  };
}

describe("computeTickAdvance — idempotência (não acelerar)", () => {
  it("três chamadas com o mesmo `now` produzem o mesmo resultado (nunca 3×)", () => {
    const snap = baseSnap({ lastTickAt: 1_000_000, elapsedSec: 0 });
    const now = 1_010_000; // +10s

    const a = computeTickAdvance(snap, now);
    const b = computeTickAdvance(snap, now);
    const c = computeTickAdvance(snap, now);

    expect(a?.elapsedSec).toBe(10);
    expect(b?.elapsedSec).toBe(10);
    expect(c?.elapsedSec).toBe(10);
    // lastTickAt também converge para o mesmo valor.
    expect(a?.lastTickAt).toBe(b?.lastTickAt);
    expect(b?.lastTickAt).toBe(c?.lastTickAt);
  });

  it("delta < 1s → não avança (protege contra timers agressivos)", () => {
    const snap = baseSnap();
    expect(computeTickAdvance(snap, snap.lastTickAt + 500)).toBeNull();
  });

  it("não avança quando pausado", () => {
    const snap = baseSnap({ isRunning: false });
    expect(computeTickAdvance(snap, snap.lastTickAt + 5000)).toBeNull();
  });

  it("countdown continua após o alvo (tempo excedido)", () => {
    const snap = baseSnap({ targetSec: 60, elapsedSec: 58, lastTickAt: 1_000_000 });
    const next = computeTickAdvance(snap, 1_005_000); // +5s → 63
    expect(next?.isRunning).toBe(true);
    expect(next?.elapsedSec).toBe(63);
  });

  it("countdown para sozinho em alvo + 5 minutos", () => {
    const snap = baseSnap({ targetSec: 60, elapsedSec: 358, lastTickAt: 1_000_000 });
    const next = computeTickAdvance(snap, 1_010_000); // passaria de 360
    expect(next?.isRunning).toBe(false);
    expect(next?.elapsedSec).toBe(360);
  });

  it("countup nunca pausa sozinho", () => {
    const snap = baseSnap({ mode: "countup", targetSec: 60, elapsedSec: 300 });
    const next = computeTickAdvance(snap, snap.lastTickAt + 3000);
    expect(next?.isRunning).toBe(true);
    expect(next?.elapsedSec).toBe(303);
  });

  it("aplicar tick em sequência simula convergência entre instâncias", () => {
    // Cada instância lê o mesmo snapshot compartilhado, aplica o tick,
    // e o resultado é redistribuído. Se o cálculo é idempotente, o
    // elapsed final = tempo real decorrido, não N × tempo real.
    let snap = baseSnap({ lastTickAt: 0, elapsedSec: 0 });
    for (let now = 1000; now <= 10_000; now += 1000) {
      // Simula 3 instâncias tentando avançar no mesmo tick.
      const r1 = computeTickAdvance(snap, now);
      const r2 = computeTickAdvance(snap, now);
      const r3 = computeTickAdvance(snap, now);
      expect(r1?.elapsedSec).toBe(r2?.elapsedSec);
      expect(r2?.elapsedSec).toBe(r3?.elapsedSec);
      if (r1) snap = r1;
    }
    // 10 ticks de 1s → 10s, não 30.
    expect(snap.elapsedSec).toBe(10);
  });
});

describe("alertMilestoneFor — mesmos marcos nos dois modos", () => {
  const T = 30 * 60;
  it("nenhum marco antes de faltar 1 minuto", () => expect(alertMilestoneFor(T - 61, T)).toBe(-1));
  it("falta 1 minuto", () => expect(alertMilestoneFor(T - 60, T)).toBe(0));
  it("tempo terminou", () => expect(alertMilestoneFor(T, T)).toBe(1));
  it("passou 1 minuto", () => expect(alertMilestoneFor(T + 60, T)).toBe(2));
  it("passou 2 minutos", () => expect(alertMilestoneFor(T + 125, T)).toBe(3));
  it("passou 5 minutos", () => expect(alertMilestoneFor(T + 300, T)).toBe(6));
  it("não passa de 5 minutos", () => expect(alertMilestoneFor(T + 900, T)).toBe(6));
});

describe("alertLevelFor", () => {
  it("verde < 80%", () => expect(alertLevelFor(50)).toBe("green"));
  it("âmbar em 80%", () => expect(alertLevelFor(80)).toBe("amber"));
  it("vermelho em 95%+", () => expect(alertLevelFor(100)).toBe("red"));
});

describe("formatMMSS", () => {
  it("zero", () => expect(formatMMSS(0)).toBe("00:00"));
  it("um minuto e meio", () => expect(formatMMSS(90)).toBe("01:30"));
  it("clamp negativo", () => expect(formatMMSS(-5)).toBe("00:00"));
});
