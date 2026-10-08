package com.osoft.iftarsaati;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
        name = "ReminderScheduler",
        permissions = {
                @Permission(
                        alias = "notifications",
                        strings = {
                                Manifest.permission.POST_NOTIFICATIONS
                        }
                )
        }
)
public class ReminderSchedulerPlugin extends Plugin {
    private static final String PREFS_NAME = "scheduled_prayer_reminders";
    private static final String IDS_KEY = "ids";
    private static final String PAYLOADS_KEY = "payloads";
    private static final String NOTIFICATION_ALIAS = "notifications";
    private static final String RENEWAL_PREFS_NAME = "prayer_reminder_renewal";
    private static final String RENEWAL_KEY = "config";

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getNotificationPermissionValue().equals("granted")) {
            call.resolve(buildStatus());
            return;
        }

        requestPermissionForAlias(NOTIFICATION_ALIAS, call, "notificationPermissionCallback");
    }

    @PluginMethod
    public void scheduleReminders(PluginCall call) {
        JSArray reminders = call.getArray("notifications", new JSArray());
        JSObject renewal = call.getObject("renewal");
        if (renewal == null) {
            call.reject("Renewal configuration is required");
            return;
        }
        scheduleRemindersInternal(getContext(), reminders);
        getContext().getSharedPreferences(RENEWAL_PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString(RENEWAL_KEY, renewal.toString()).apply();
        PrayerReminderRefreshJobService.ensureScheduled(getContext());
        call.resolve();
    }

    @PluginMethod
    public void scheduleTestReminder(PluginCall call) {
        JSObject notification = call.getObject("notification");
        if (notification == null) {
            call.reject("Notification is required");
            return;
        }
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager is unavailable");
            return;
        }
        int id = notification.optInt("id", 99999901);
        long triggerAt = notification.optLong("triggerAt", 0L);
        if (triggerAt <= System.currentTimeMillis()) {
            call.reject("Test alarm must be in the future");
            return;
        }
        Intent intent = new Intent(getContext(), PrayerReminderReceiver.class);
        intent.putExtra("reminderId", id);
        intent.putExtra("title", notification.optString("title", "Vakt-i Şerif Test"));
        intent.putExtra("body", notification.optString("body", "Bildirimler çalışıyor."));
        intent.putExtra("channel", notification.optString("channel", "main"));
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                getContext(), id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        scheduleAlarm(alarmManager, triggerAt, pendingIntent);
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        String screen = call.getString("screen", "notifications");
        boolean opened = openSettingsScreen(getContext(), screen);
        JSObject result = new JSObject();
        result.put("opened", opened);
        result.put("screen", screen);
        call.resolve(result);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(buildStatus());
    }

    public static void reschedulePersistedReminders(Context context) {
        JSONArray payloads = getPersistedPayloads(context);
        if (payloads.length() == 0) {
            return;
        }

        scheduleRemindersInternal(context, payloads);
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        cancelAllInternal();
        getContext().getSharedPreferences(RENEWAL_PREFS_NAME, Context.MODE_PRIVATE)
                .edit().remove(RENEWAL_KEY).apply();
        PrayerReminderRefreshJobService.cancelScheduled(getContext());
        call.resolve();
    }

    static synchronized void scheduleRemindersInternal(Context context, JSONArray reminders) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        cancelAllInternal(context);

        Set<String> reminderIds = new HashSet<>();
        JSONArray persistedPayloads = new JSONArray();

        for (int i = 0; i < reminders.length(); i++) {
            try {
                JSONObject item = reminders.getJSONObject(i);
                int id = item.optInt("id", 0);
                long triggerAt = item.optLong("triggerAt", 0L);
                String title = item.optString("title", "Vakt-i Şerif");
                String body = item.optString("body", "Namaz vaktini takip edin.");
                String channel = item.optString("channel", "main");

                if (id == 0 || triggerAt <= System.currentTimeMillis()) {
                    continue;
                }

                Intent intent = new Intent(context, PrayerReminderReceiver.class);
                intent.putExtra("reminderId", id);
                intent.putExtra("title", title);
                intent.putExtra("body", body);
                intent.putExtra("channel", channel);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        id,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                scheduleAlarm(alarmManager, triggerAt, pendingIntent);
                reminderIds.add(String.valueOf(id));
                persistedPayloads.put(item);
            } catch (JSONException ignored) {
                // Skip invalid reminder payloads.
            }
        }

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(IDS_KEY, reminderIds)
                .putString(PAYLOADS_KEY, persistedPayloads.toString())
                .apply();
    }

    private void cancelAllInternal() {
        cancelAllInternal(getContext());
    }

    private static synchronized void cancelAllInternal(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        Set<String> ids = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getStringSet(IDS_KEY, new HashSet<>());

        for (String rawId : ids) {
            int id;
            try {
                id = Integer.parseInt(rawId);
            } catch (NumberFormatException error) {
                continue;
            }

            Intent intent = new Intent(context, PrayerReminderReceiver.class);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(pendingIntent);
        }

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(IDS_KEY)
                .remove(PAYLOADS_KEY)
                .apply();
    }

    private JSObject buildStatus() {
        JSObject result = new JSObject();
        result.put("permission", getNotificationPermissionValue());
        result.put("exactAlarmsSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
        result.put("exactAlarmsAllowed", canScheduleExactAlarms());
        return result;
    }

    private String getNotificationPermissionValue() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "granted";
        }

        PermissionState state = getPermissionState(NOTIFICATION_ALIAS);
        if (state == PermissionState.GRANTED) {
            return "granted";
        }
        if (state == PermissionState.DENIED) {
            return "denied";
        }
        return "default";
    }

    private boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    private static void scheduleAlarm(AlarmManager alarmManager, long triggerAt, PendingIntent pendingIntent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            return;
        }

        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
    }

    private static JSONArray getPersistedPayloads(Context context) {
        String rawPayloads = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PAYLOADS_KEY, "[]");

        try {
            return new JSONArray(rawPayloads);
        } catch (JSONException ignored) {
            return new JSONArray();
        }
    }

    static JSONObject getRenewalConfig(Context context) {
        String raw = context.getSharedPreferences(RENEWAL_PREFS_NAME, Context.MODE_PRIVATE)
                .getString(RENEWAL_KEY, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (JSONException ignored) {
            return null;
        }
    }

    private boolean openSettingsScreen(Context context, String screen) {
        Intent intent;
        if ("exactAlarms".equals(screen)) {
            intent = buildExactAlarmSettingsIntent(context);
        } else {
            intent = buildNotificationSettingsIntent(context);
        }

        try {
            Activity activity = getActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
            return true;
        } catch (ActivityNotFoundException error) {
            return false;
        }
    }

    private Intent buildNotificationSettingsIntent(Context context) {
        Intent intent;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", context.getPackageName(), null));
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    private Intent buildExactAlarmSettingsIntent(Context context) {
        Intent intent;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                    .setData(Uri.fromParts("package", context.getPackageName(), null));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", context.getPackageName(), null));
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }
}
