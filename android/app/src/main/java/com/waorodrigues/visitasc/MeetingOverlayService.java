package com.waorodrigues.visitasc;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Boia do controle de tempo da REUNIÃO por cima de outros apps, com ⏮ ⏸ ⏭ ⤢.
 * O estado exibido é simulado aqui; cada toque é gravado (ação + hora) em
 * SharedPreferences e o app reaplica as ações com a mesma lógica ao voltar.
 */
public class MeetingOverlayService extends Service {
    static final String PREFS = "meetingOverlay";
    private WindowManager wm;
    private LinearLayout root;
    private TextView timeView, titleView, playBtn;
    private WindowManager.LayoutParams lp;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private String[] ids = new String[0], titles = new String[0];
    private long[] planned = new long[0], spent = new long[0];
    private int active = -1, lastDone = -1;
    private long startedAt = 0, pausedAt = 0; // 0 = nenhum
    private boolean countUp = false;
    private String size = "m";

    private final Runnable tick = new Runnable() { @Override public void run() { render(); handler.postDelayed(this, 500); } };

    @Override public IBinder onBind(Intent intent) { return null; }
    private int dp(float v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            JSONObject o = new JSONObject(intent != null && intent.getStringExtra("json") != null ? intent.getStringExtra("json") : "{}");
            JSONArray parts = o.optJSONArray("parts"); if (parts == null) parts = new JSONArray();
            int n = parts.length();
            ids = new String[n]; titles = new String[n]; planned = new long[n]; spent = new long[n];
            for (int i = 0; i < n; i++) {
                JSONObject p = parts.getJSONObject(i);
                ids[i] = p.optString("id"); titles[i] = p.optString("title");
                planned[i] = p.optLong("plannedMs", -1); spent[i] = p.optLong("spentMs", 0);
            }
            active = o.optInt("active", -1); lastDone = o.optInt("lastDone", -1);
            startedAt = o.optLong("startedAt", 0); pausedAt = o.optLong("pausedAt", 0);
            countUp = o.optBoolean("countUp", false); size = o.optString("size", "m");
            getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("actions", "[]").apply();
            if (root != null) { try { wm.removeView(root); } catch (Exception ignored) { } root = null; }
            ensureView();
        } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        handler.removeCallbacks(tick); handler.post(tick);
        return START_NOT_STICKY;
    }

    private void log(String a) {
        SharedPreferences sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray arr = new JSONArray(sp.getString("actions", "[]"));
            arr.put(new JSONObject().put("a", a).put("t", System.currentTimeMillis()));
            sp.edit().putString("actions", arr.toString()).apply();
        } catch (Exception ignored) { }
    }

    private long spentOf(int i, long now) {
        long ms = spent[i];
        if (i == active && startedAt > 0) ms += Math.max(0, (pausedAt > 0 ? pausedAt : now) - startedAt);
        return ms;
    }
    private void closeActive(long now) {
        if (active < 0) return;
        spent[active] = spentOf(active, now); lastDone = active;
        active = -1; startedAt = 0; pausedAt = 0;
    }
    private int step(int dir) {
        if (ids.length == 0) return -1;
        int ref = active >= 0 ? active : lastDone;
        if (ref < 0) return dir == 1 ? 0 : -1;
        int j = ref + dir;
        return j >= 0 && j < ids.length ? j : -1;
    }
    private void go(int dir) {
        int j = step(dir); if (j < 0) return;
        long now = System.currentTimeMillis();
        log(dir == 1 ? "next" : "prev");
        if (j == active) { closeActive(now); render(); return; }
        closeActive(now);
        active = j; startedAt = now; pausedAt = 0; render();
    }
    private void play() {
        long now = System.currentTimeMillis();
        if (active >= 0) {
            log("play");
            if (pausedAt > 0) { startedAt += now - pausedAt; pausedAt = 0; } else pausedAt = now;
            render();
        } else go(1);
    }

    private TextView button(String txt, View.OnClickListener l, int size) {
        TextView b = new TextView(this);
        b.setText(txt); b.setTextColor(Color.WHITE); b.setGravity(Gravity.CENTER);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, size == 0 ? 16 : size == 2 ? 24 : 20);
        int s = dp(size == 0 ? 32 : size == 2 ? 48 : 40);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(s, s); p.setMargins(dp(2), 0, dp(2), 0);
        b.setLayoutParams(p); b.setOnClickListener(l);
        return b;
    }

    private void ensureView() {
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        int sz = "s".equals(size) ? 0 : "l".equals(size) ? 2 : 1;
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(12), dp(8), dp(12), dp(8));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(235, 20, 22, 26)); bg.setCornerRadius(dp(20));
        root.setBackground(bg);
        titleView = new TextView(this);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, sz == 2 ? 14 : 12);
        titleView.setTextColor(Color.argb(200, 255, 255, 255));
        titleView.setMaxLines(1); titleView.setMaxWidth(dp(220));
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        timeView = new TextView(this);
        timeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, sz == 0 ? 18 : sz == 2 ? 32 : 24);
        timeView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL); row.setGravity(Gravity.CENTER_VERTICAL);
        playBtn = button("▶", v -> play(), sz);
        if (sz == 0) {
            row.addView(timeView); row.addView(playBtn);
            root.addView(row);
        } else {
            root.addView(titleView); root.addView(timeView);
            row.addView(button("⏮", v -> go(-1), sz));
            row.addView(playBtn);
            row.addView(button("⏭", v -> go(1), sz));
            row.addView(button("⤢", v -> openApp(), sz));
            root.addView(row);
        }
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        SharedPreferences sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        lp.x = sp.getInt("x", dp(12)); lp.y = sp.getInt("y", dp(140));
        View.OnTouchListener drag = new View.OnTouchListener() {
            int sx, sy; float tx, ty; boolean moved;
            @Override public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN: sx = lp.x; sy = lp.y; tx = e.getRawX(); ty = e.getRawY(); moved = false; return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - tx), dy = (int) (e.getRawY() - ty);
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        lp.x = sx + dx; lp.y = sy + dy;
                        try { wm.updateViewLayout(root, lp); } catch (Exception ignored) { }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (moved) getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("x", lp.x).putInt("y", lp.y).apply();
                        else openApp();
                        return true;
                }
                return false;
            }
        };
        timeView.setOnTouchListener(drag); titleView.setOnTouchListener(drag); root.setOnTouchListener(drag);
        wm.addView(root, lp);
    }

    private void openApp() {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try { startActivity(i); } catch (Exception ignored) { }
    }

    private static String fmt(long ms) {
        long t = Math.abs(ms) / 1000, h = t / 3600, m = (t % 3600) / 60, s = t % 60;
        String b = h > 0 ? String.format(java.util.Locale.US, "%d:%02d:%02d", h, m, s) : String.format(java.util.Locale.US, "%d:%02d", m, s);
        return ms < 0 ? "-" + b : b;
    }

    private void render() {
        if (timeView == null) return;
        long now = System.currentTimeMillis();
        boolean running = active >= 0 && pausedAt == 0;
        playBtn.setText(running ? "⏸" : "▶");
        if (active < 0) { timeView.setText("--:--"); timeView.setTextColor(Color.WHITE); titleView.setText("Reunião"); return; }
        long sp = spentOf(active, now), pl = planned[active];
        int color = Color.WHITE;
        String txt;
        if (pl > 0) {
            long left = pl - sp;
            color = left < 0 ? Color.rgb(255, 99, 88) : left <= 60_000 ? Color.rgb(255, 184, 56) : Color.rgb(74, 222, 128);
            txt = countUp ? fmt(sp) : fmt(left);
        } else txt = fmt(sp);
        if (pausedAt > 0) txt = "❚❚ " + txt;
        timeView.setText(txt); timeView.setTextColor(color);
        titleView.setText(titles[active]);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        if (root != null && wm != null) { try { wm.removeView(root); } catch (Exception ignored) { } }
        root = null;
        super.onDestroy();
    }
}
