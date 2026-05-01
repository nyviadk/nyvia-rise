package nyvia.rise.module

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d("NyviaRise", "AlarmReceiver triggered. Action: $action")

        // 1. Vi sikrer, at vi kun reagerer på vores egne alarmer (undgår Google Clock konflikten)
        // (Forudsætter at vi sætter action til "NYVIA_RISE_ALARM" når vi opretter alarmen senere)
        if (action != null && action != "NYVIA_RISE_ALARM") {
            Log.d("NyviaRise", "Ignorerer intent, da action ikke matcher NYVIA_RISE_ALARM")
            return
        }

        // 2. Vi henter det unikke ID, så vi ved 100% individuelt hvilken alarm der ringer
        val alarmId = intent.getStringExtra("ALARM_ID")

        // 3. Vi sender ID'et videre til AlarmService
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra("ALARM_ID", alarmId)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("NyviaRise", "Kritisk fejl: Kunne ikke starte AlarmService - ${e.message}")
        }
    }
}