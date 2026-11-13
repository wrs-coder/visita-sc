package com.waorodrigues.visitasc;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Espelho do relógio do Controle de tempo na rede local (roteador do salão, sem internet).
 * Mini-servidor só de leitura: "/" devolve a página do relógio e "/state" o último retrato
 * enviado pelo app. Não aceita gravações nem serve nenhum outro arquivo.
 */
@CapacitorPlugin(name = "TimerMirrorServer")
public class TimerMirrorServerPlugin extends Plugin {

    private volatile ServerSocket server;
    private volatile ExecutorService pool;
    private volatile String html = "";
    private volatile String snap = "null";
    private volatile int port = 0;
    private final Map<String, Long> seen = new ConcurrentHashMap<>();

    @PluginMethod
    public void start(PluginCall call) {
        String h = call.getString("html", "");
        html = h == null ? "" : h;
        int want = call.getInt("port", 8080);
        if (server == null || server.isClosed()) {
            ServerSocket s = null;
            for (int p = want; p < want + 10 && s == null; p++) {
                try {
                    ServerSocket c = new ServerSocket();
                    c.setReuseAddress(true);
                    c.bind(new InetSocketAddress(p));
                    s = c;
                    port = p;
                } catch (Exception ignored) { }
            }
            if (s == null) { call.reject("bind-failed"); return; }
            server = s;
            pool = Executors.newFixedThreadPool(4);
            final ServerSocket srv = s;
            Thread t = new Thread(() -> loop(srv), "TimerMirrorServer");
            t.setDaemon(true);
            t.start();
        }
        JSObject r = new JSObject();
        String ip = localIp();
        r.put("ip", ip == null ? JSObject.NULL : ip);
        r.put("port", port);
        call.resolve(r);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String j = call.getString("json", "null");
        snap = j == null ? "null" : j;
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        shutdown();
        call.resolve();
    }

    @PluginMethod
    public void info(PluginCall call) {
        long now = System.currentTimeMillis();
        int n = 0;
        Iterator<Map.Entry<String, Long>> it = seen.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Long> e = it.next();
            if (now - e.getValue() <= 25_000) n++; else it.remove();
        }
        JSObject r = new JSObject();
        boolean running = server != null && !server.isClosed();
        String ip = localIp();
        r.put("running", running);
        r.put("ip", ip == null ? JSObject.NULL : ip);
        r.put("port", port);
        r.put("viewers", n);
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        shutdown();
        super.handleOnDestroy();
    }

    private void shutdown() {
        ServerSocket s = server;
        server = null;
        if (s != null) { try { s.close(); } catch (Exception ignored) { } }
        ExecutorService p = pool;
        pool = null;
        if (p != null) p.shutdownNow();
        seen.clear();
        snap = "null";
    }

    private void loop(ServerSocket srv) {
        while (!srv.isClosed()) {
            try {
                final Socket c = srv.accept();
                ExecutorService p = pool;
                if (p == null) { c.close(); break; }
                p.execute(() -> handle(c));
            } catch (Exception e) {
                if (srv.isClosed()) break;
            }
        }
    }

    private void handle(Socket c) {
        try {
            c.setSoTimeout(5000);
            BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.US_ASCII));
            String line = in.readLine();
            if (line == null) { c.close(); return; }
            // Descarta os cabeçalhos (limite de segurança).
            int guard = 0;
            String hl;
            while ((hl = in.readLine()) != null && !hl.isEmpty() && guard++ < 100) { /* ignora */ }
            String[] parts = line.split(" ");
            String method = parts.length > 0 ? parts[0] : "";
            String path = parts.length > 1 ? parts[1] : "/";
            int q = path.indexOf('?');
            if (q >= 0) path = path.substring(0, q);
            OutputStream out = c.getOutputStream();
            if (!"GET".equals(method)) {
                write(out, 405, "text/plain; charset=utf-8", "Method Not Allowed");
            } else if ("/".equals(path) || "/index.html".equals(path)) {
                write(out, 200, "text/html; charset=utf-8", html);
            } else if ("/state".equals(path)) {
                InetAddress a = c.getInetAddress();
                if (a != null) seen.put(a.getHostAddress(), System.currentTimeMillis());
                write(out, 200, "application/json; charset=utf-8",
                        "{\"serverNow\":" + System.currentTimeMillis() + ",\"snap\":" + snap + "}");
            } else {
                write(out, 404, "text/plain; charset=utf-8", "Not Found");
            }
        } catch (Exception ignored) {
        } finally {
            try { c.close(); } catch (Exception ignored) { }
        }
    }

    private static void write(OutputStream out, int code, String type, String body) throws Exception {
        byte[] b = body.getBytes(StandardCharsets.UTF_8);
        String status = code == 200 ? "OK" : code == 404 ? "Not Found" : "Method Not Allowed";
        String head = "HTTP/1.1 " + code + " " + status + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + b.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "X-Content-Type-Options: nosniff\r\n"
                + "Connection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.US_ASCII));
        out.write(b);
        out.flush();
    }

    /** IPv4 do Wi‑Fi (192.168.x.x / 10.x / 172.16-31.x), preferindo a interface wlan. */
    private static String localIp() {
        String fallback = null;
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                String name = ni.getName() == null ? "" : ni.getName();
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || !a.isSiteLocalAddress()) continue;
                    String ip = a.getHostAddress();
                    if (name.startsWith("wlan") || name.startsWith("ap") || name.startsWith("swlan")) return ip;
                    if (fallback == null && !name.startsWith("rmnet") && !name.startsWith("ccmni")) fallback = ip;
                }
            }
        } catch (Exception ignored) { }
        return fallback;
    }
}
