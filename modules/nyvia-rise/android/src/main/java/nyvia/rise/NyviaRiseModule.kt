package nyvia.rise

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NyviaRiseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NyviaRise")

    Function("scheduleAlarm") { timestamp: Long ->
      val context = appContext.reactContext
      
      if (context != null) {
        val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
        prefs.edit().putLong("next_alarm", timestamp).apply()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
          context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (timestamp > System.currentTimeMillis()) {
          val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, pendingIntent)
          alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
        } else {
          alarmManager.cancel(pendingIntent)
        }
      }
    }

    Function("stopAlarm") {
      val context = appContext.reactContext
      
      if (context != null) {
        val intent = Intent(context, AlarmService::class.java)
        context.stopService(intent)
      }
    }

    Function("testAlarm") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, AlarmService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
      }
    }

    // NY FUNKTION: Tjekker om alarmen bipper lige nu
    Function("isAlarmActive") {
      return@Function AlarmService.isRinging
    }
  }
}