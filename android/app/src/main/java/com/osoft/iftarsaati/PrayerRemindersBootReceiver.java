package com.osoft.iftarsaati;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PrayerRemindersBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            ReminderSchedulerPlugin.reschedulePersistedReminders(context);
        }
    }
}
