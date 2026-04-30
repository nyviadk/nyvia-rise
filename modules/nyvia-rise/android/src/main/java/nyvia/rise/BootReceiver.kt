package nyvia.rise.module

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
            val nextAlarm = prefs.getLong("next_alarm", 0)

            if (nextAlarm > System.currentTimeMillis()) {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val alarmIntent = Intent(context, AlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context, 0, alarmIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                val alarmClockInfo = AlarmManager.AlarmClockInfo(nextAlarm, pendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            }
        }
    }
}