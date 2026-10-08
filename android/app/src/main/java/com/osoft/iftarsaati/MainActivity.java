package com.osoft.iftarsaati;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReminderSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
