package com.waorodrigues.visitasc;

import android.app.Service;
import android.content.Intent;
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

/** Bolinha flutuante do Controle de tempo: arrastável, toque volta ao app. */
public class FloatingTimerService extends Service {
    private WindowManager wm;
    private LinearLayout root;
    private TextView timeView, titleView;
    private WindowManager.LayoutParams lp;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String title = "", program = "";
    private long startedAt, spentMs, plannedMs = -1;
    private boolean paused;

    private final Runnable tick = new Runnable() {
        @Override public void run() { render(); handler.postDelayed(this, 500); }
    };

    @Override public IBinder onBind(Intent intent) { return null; }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            title = intent.getStringExtra("title"); if (title == null) title = "";
            program = intent.getStringExtra("program"); if (program == null) program = "";
            startedAt = intent.getLongExtra("startedAt", 0);
            spentMs = intent.getLongExtra("spentMs", 0);
            plannedMs = intent.getLongExtra("plannedMs", -1);
            paused = intent.getBooleanExtra("paused", false);
        }
        try { ensureView(); } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        handler.removeCallbacks(tick);
        handler.post(tick);
        return START_NOT_STICKY;
    }

    private void ensureView() {
        if (root != null) return;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(14), dp(8), dp(14), dp(8));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(235, 20, 22, 26));
        bg.setCornerRadius(dp(18));
        root.setBackground(bg);
        timeView = new TextView(this);
        timeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        timeView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        titleView = new TextView(this);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        titleView.setTextColor(Color.argb(200, 255, 255, 255));
        titleView.setMaxLines(1);
        titleView.setMaxWidth(dp(200));
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        root.addView(timeView);
        root.addView(titleView);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = dp(12); lp.y = dp(120);

        root.setOnTouchListener(new View.OnTouchListener() {
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
                        if (!moved) openApp();
                        return true;
                }
                return false;
            }
        });
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
        return ms < 0 ? "+" + b : b;
    }

    private void render() {
        if (timeView == null) return;
        long now = System.currentTimeMillis();
        long spent = spentMs + (paused || startedAt <= 0 ? 0 : Math.max(0, now - startedAt));
        String txt; int color;
        if (plannedMs > 0) {
            long left = plannedMs - spent;
            txt = fmt(left);
            color = left < 0 ? Color.rgb(255, 99, 88) : left <= 60_000 ? Color.rgb(255, 184, 56) : Color.rgb(74, 222, 128);
        } else { txt = fmt(spent); color = Color.WHITE; }
        if (paused) txt = "❚❚ " + txt;
        if (!program.isEmpty()) txt = txt + "   " + program;
        timeView.setText(txt);
        timeView.setTextColor(color);
        titleView.setText(title);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        if (root != null && wm != null) { try { wm.removeView(root); } catch (Exception ignored) { } }
        root = null;
        super.onDestroy();
    }
}
