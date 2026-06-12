package com.osoft.iftarsaati;

import android.Manifest;
import android.app.Activity;
import android.app.ActivityNotFoundException;
import android.app.AlarmManager;
import android.app.PendingIntent;
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
        scheduleRemindersInternal(getContext(), reminders);
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
        call.resolve();
    }

    private static void scheduleRemindersInternal(Context context, JSONArray reminders) {
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
                String title = item.optString("title", "IftarSaati App");
                String body = item.optString("body", "Vakiti takip et");
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

    private static void cancelAllInternal(Context context) {
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
