package com.madoverlord.game;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/**
 * 앱 업데이트 (D-074) — js/ui_v2/appUpdate_v2.js 에서 window.Capacitor.Plugins.AppUpdate 로 부름.
 * download({ url, fileName }): APK를 앱 전용 폴더(Android/data/…/files/Download)로 내려받고(저장 권한 필요 없음)
 * 0.5초마다 'progress' { done, total } 를 알리고, 다 받으면 Android 설치 화면을 연다 → { status: 'installing' }.
 * 이 앱에 "알 수 없는 앱 설치" 권한이 없으면 그 설정 화면을 열고 { status: 'needPermission' }.
 * url이 file:// 이면 내려받지 않고 그 파일로 바로 설치 화면 (에뮬레이터 시험용).
 * fetchText({ url, timeout, headers }): 업데이트 정보(NAS latest.json)를 읽어 { status, text } (D-081) —
 * WebView의 fetch는 다른 주소라 CORS에 막히므로 여기서 읽음. 256KB까지, 넘거나 실패하면 reject.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private final Handler main = new Handler(Looper.getMainLooper());

    private static final int MAX_TEXT = 256 * 1024;

    @PluginMethod
    public void fetchText(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("url이 없음");
            return;
        }
        int timeout = call.getInt("timeout", 8000);
        JSObject headers = call.getObject("headers", new JSObject());
        new Thread(() -> {
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                con.setConnectTimeout(timeout);
                con.setReadTimeout(timeout);
                con.setUseCaches(false);
                for (Iterator<String> it = headers.keys(); it.hasNext(); ) {
                    String k = it.next();
                    con.setRequestProperty(k, headers.getString(k));
                }
                int status = con.getResponseCode();
                InputStream in = status < 400 ? con.getInputStream() : con.getErrorStream();
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                if (in != null) {
                    byte[] b = new byte[8192];
                    for (int n; (n = in.read(b)) > 0; ) {
                        buf.write(b, 0, n);
                        if (buf.size() > MAX_TEXT) throw new Exception("너무 큼");
                    }
                    in.close();
                }
                JSObject r = new JSObject();
                r.put("status", status);
                r.put("text", new String(buf.toByteArray(), StandardCharsets.UTF_8));
                call.resolve(r);
            } catch (Exception e) {
                call.reject("읽지 못함: " + e.getMessage());
            } finally {
                if (con != null) con.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url이 없음");
            return;
        }
        String name = call.getString("fileName", "MadOverlord-update.apk").replaceAll("[^A-Za-z0-9._-]", "_");
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
            Intent perm = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(perm);
            JSObject r = new JSObject();
            r.put("status", "needPermission");
            call.resolve(r);
            return;
        }
        if (url.startsWith("file://")) {
            install(new File(Uri.parse(url).getPath()), call);
            return;
        }
        File file = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name);
        if (file.exists()) file.delete();
        DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
                .setTitle("매드 오버로드 업데이트")
                .setMimeType(APK_MIME)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, name);
        long id = dm.enqueue(req);
        poll(dm, id, file, call);
    }

    private void poll(DownloadManager dm, long id, File file, PluginCall call) {
        main.postDelayed(() -> {
            try (Cursor c = dm.query(new DownloadManager.Query().setFilterById(id))) {
                if (c == null || !c.moveToFirst()) {
                    call.reject("내려받기가 취소됨");
                    return;
                }
                int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                JSObject p = new JSObject();
                p.put("done", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)));
                p.put("total", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)));
                notifyListeners("progress", p);
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    install(file, call);
                    return;
                }
                if (status == DownloadManager.STATUS_FAILED) {
                    call.reject("내려받기 실패 (사유 " + c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)) + ")");
                    return;
                }
            }
            poll(dm, id, file, call);
        }, 500);
    }

    private void install(File file, PluginCall call) {
        if (!file.exists()) {
            call.reject("APK 파일이 없음: " + file.getName());
            return;
        }
        Context ctx = getContext();
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, APK_MIME);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
        JSObject r = new JSObject();
        r.put("status", "installing");
        call.resolve(r);
    }
}
