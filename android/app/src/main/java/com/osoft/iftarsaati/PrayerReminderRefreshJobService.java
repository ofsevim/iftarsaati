package com.osoft.iftarsaati;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

public class PrayerReminderRefreshJobService extends JobService {
    private static final int JOB_ID = 731249;
    private static final String CACHE_PREFS = "prayer_calendar_cache";
    private static final String[] KEYS = {"Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"};
    private static final String[] LABELS = {"İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"};

    static void ensureScheduled(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null || scheduler.getPendingJob(JOB_ID) != null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(context, PrayerReminderRefreshJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(12 * 60 * 60 * 1000L)
                .setPersisted(true)
                .build();
        scheduler.schedule(job);
    }

    static void cancelScheduled(Context context) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler != null) scheduler.cancel(JOB_ID);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            boolean retry = false;
            try {
                JSONObject config = ReminderSchedulerPlugin.getRenewalConfig(getApplicationContext());
                if (config == null) return;
                JSONArray reminders = buildReminders(config);
                if (reminders.length() > 0) {
                    ReminderSchedulerPlugin.scheduleRemindersInternal(getApplicationContext(), reminders);
                }
            } catch (Exception error) {
                android.util.Log.e("PrayerReminderRefresh", "Could not renew reminders", error);
                retry = true;
            } finally {
                jobFinished(params, retry);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    private JSONArray buildReminders(JSONObject config) throws Exception {
        double lat = config.getDouble("lat");
        double lng = config.getDouble("lng");
        String city = config.getString("city");
        JSONObject minutes = config.getJSONObject("minutes");
        Calendar today = Calendar.getInstance();
        today.set(Calendar.HOUR_OF_DAY, 0);
        today.set(Calendar.MINUTE, 0);
        today.set(Calendar.SECOND, 0);
        today.set(Calendar.MILLISECOND, 0);

        Map<String, JSONObject> rows = new HashMap<>();
        JSONArray reminders = new JSONArray();
        for (int offset = 0; offset < 7; offset++) {
            Calendar day = (Calendar) today.clone();
            day.add(Calendar.DAY_OF_MONTH, offset);
            int year = day.get(Calendar.YEAR);
            int month = day.get(Calendar.MONTH) + 1;
            int date = day.get(Calendar.DAY_OF_MONTH);
            String dateKey = year + "-" + month + "-" + date;
            if (!rows.containsKey(dateKey)) {
                rows.putAll(fetchCalendar(year, month, lat, lng));
            }
            JSONObject row = rows.get(dateKey);
            if (row == null) throw new IllegalStateException("Missing calendar day: " + dateKey);
            JSONObject timings = row.getJSONObject("timings");
            JSONObject hijriMonth = row.getJSONObject("date").getJSONObject("hijri").getJSONObject("month");
            boolean isRamadan = hijriMonth.optInt("number") == 9;

            for (int index = 0; index < KEYS.length; index++) {
                String key = KEYS[index];
                int before = minutes.optInt(key, -1);
                if (before < 0) continue;
                String rawTime = timings.optString(key, "").split(" ")[0].trim();
                String[] parts = rawTime.split(":");
                if (parts.length < 2) continue;
                int hour;
                int minute;
                try {
                    hour = Integer.parseInt(parts[0]);
                    minute = Integer.parseInt(parts[1]);
                } catch (NumberFormatException ignored) {
                    continue;
                }
                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

                Calendar trigger = (Calendar) day.clone();
                trigger.set(Calendar.HOUR_OF_DAY, hour);
                trigger.set(Calendar.MINUTE, minute);
                long triggerAt = trigger.getTimeInMillis() - before * 60_000L;
                if (triggerAt <= System.currentTimeMillis()) continue;

                boolean isIftar = isRamadan && index == 4;
                boolean isSahur = isRamadan && index == 0;
                String title;
                String body;
                if (isIftar) {
                    title = before == 0 ? "İftar Vakti" : "İftar Yaklaşıyor";
                    body = before == 0
                            ? city + " için iftar vakti girdi."
                            : city + " için iftara " + before + " dakika kaldı.";
                } else if (isSahur) {
                    title = "Sahur Vakti";
                    body = before == 0
                            ? city + " için sahur vakti girdi."
                            : city + " için sahura " + before + " dakika kaldı.";
                } else {
                    String label = LABELS[index];
                    String lowerLabel = label.toLowerCase(new java.util.Locale("tr", "TR"));
                    title = label + " Vakti";
                    body = before == 0
                            ? city + " için " + lowerLabel + " vakti girdi."
                            : city + " için " + lowerLabel + " vaktine " + before + " dakika kaldı.";
                }

                JSONObject reminder = new JSONObject();
                reminder.put("id", Integer.parseInt(String.format(java.util.Locale.US,
                        "%02d%02d%02d%02d", year % 100, month, date, index)));
                reminder.put("title", title);
                reminder.put("body", body);
                reminder.put("triggerAt", triggerAt);
                reminder.put("channel", (isIftar || isSahur) ? "special" : "main");
                reminders.put(reminder);
            }
        }
        return reminders;
    }

    private Map<String, JSONObject> fetchCalendar(int year, int month, double lat, double lng) throws Exception {
        String cacheKey = String.format(java.util.Locale.US, "%d-%d-%.2f-%.2f", year, month, lat, lng);
        android.content.SharedPreferences cachePrefs =
                getApplicationContext().getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE);

        String rawJson = null;
        Exception lastError = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                rawJson = downloadCalendarJson(year, month, lat, lng);
                cachePrefs.edit().putString(cacheKey, rawJson).apply();
                break;
            } catch (Exception error) {
                lastError = error;
            }
        }

        if (rawJson == null) {
            rawJson = cachePrefs.getString(cacheKey, null);
        }
        if (rawJson == null) {
            throw lastError != null ? lastError : new IllegalStateException("Calendar fetch failed");
        }

        JSONArray data = new JSONObject(rawJson).getJSONArray("data");
        Map<String, JSONObject> rows = new HashMap<>();
        for (int i = 0; i < data.length(); i++) {
            JSONObject row = data.getJSONObject(i);
            JSONObject gregorian = row.getJSONObject("date").getJSONObject("gregorian");
            String dateKey = gregorian.getInt("year") + "-" +
                    gregorian.getJSONObject("month").getInt("number") + "-" + gregorian.getInt("day");
            rows.put(dateKey, row);
        }
        return rows;
    }

    private String downloadCalendarJson(int year, int month, double lat, double lng) throws Exception {
        URL url = new URL("https://api.aladhan.com/v1/calendar/" + year + "/" + month +
                "?latitude=" + lat + "&longitude=" + lng + "&method=13");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(10_000);
        try {
            if (connection.getResponseCode() != 200) {
                throw new IllegalStateException("Calendar HTTP " + connection.getResponseCode());
            }
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            return body.toString();
        } finally {
            connection.disconnect();
        }
    }
}
