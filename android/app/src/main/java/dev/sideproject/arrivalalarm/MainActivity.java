package dev.sideproject.arrivalalarm;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Opened once from the package installer, a launcher tap starts a second copy on top of
        // the existing task. Close that copy so the original task (and recents entry) is reused.
        Intent intent = getIntent();
        if (!isTaskRoot()
                && intent != null
                && Intent.ACTION_MAIN.equals(intent.getAction())
                && intent.hasCategory(Intent.CATEGORY_LAUNCHER)) {
            super.onCreate(savedInstanceState);
            finish();
            return;
        }
        super.onCreate(savedInstanceState);
    }
}
