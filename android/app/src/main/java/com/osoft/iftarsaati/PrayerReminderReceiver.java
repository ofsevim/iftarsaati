package com.osoft.iftarsaati;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class PrayerReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        String rawChannel = intent.getStringExtra("channel");
        String channel;
        String channelLabel;
        if ("special".equals(rawChannel)) {
            channel = "special";
            channelLabel = "İftar ve Sahur";
        } else if ("azan".equals(rawChannel)) {
            channel = "azan";
            channelLabel = "Ezan Vakti";
        } else {
            channel = "main";
            channelLabel = "Namaz Vakitleri";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(
                    channel,
                    channelLabel,
                    NotificationManager.IMPORTANCE_HIGH
            ));
        }

        String title = intent.getStringExtra("title");
        if (title == null || title.trim().isEmpty()) {
            title = "Vakt-i Şerif";
        }
        String body = intent.getStringExtra("body");
        if (body == null) {
            body = "";
        }

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openApp = PendingIntent.getActivity(
                context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, channel)
                .setSmallIcon(R.drawable.ic_stat_vaktiserif)
                .setColor(0xFFC9A961)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(openApp)
                .setPriority(NotificationCompat.PRIORITY_HIGH);
        manager.notify(intent.getIntExtra("reminderId", 0), notification.build());
    }
}
