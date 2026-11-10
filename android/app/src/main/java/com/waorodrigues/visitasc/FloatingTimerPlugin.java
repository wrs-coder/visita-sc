package com.waorodrigues.visitasc;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Controle de tempo do evento: bolinha flutuante por cima de outros apps
 * ("Sobrepor a outros apps"). O serviço recebe o horário-alvo e conta sozinho.
 */
@CapacitorPlugin(name = "FloatingTimer")
public class FloatingTimerPlugin extends Plugin {

    private boolean canDraw() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
    }

    @PluginMethod
    public void check(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", canDraw());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (!canDraw() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception ignored) { }
        }
        JSObject r = new JSObject();
        r.put("granted", canDraw());
        call.resolve(r);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canDraw()) { call.reject("no-permission"); return; }
        Intent i = new Intent(getContext(), FloatingTimerService.class);
        i.putExtra("title", call.getString("title", ""));
        i.putExtra("program", call.getString("program", ""));
        i.putExtra("startedAt", call.getDouble("startedAt", 0d).longValue());
        i.putExtra("spentMs", call.getDouble("spentMs", 0d).longValue());
        i.putExtra("plannedMs", call.getDouble("plannedMs", -1d).longValue());
        i.putExtra("paused", Boolean.TRUE.equals(call.getBoolean("paused", false)));
        try { getContext().startService(i); call.resolve(); }
        catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        try { getContext().stopService(new Intent(getContext(), FloatingTimerService.class)); } catch (Exception ignored) { }
        call.resolve();
    }
}
