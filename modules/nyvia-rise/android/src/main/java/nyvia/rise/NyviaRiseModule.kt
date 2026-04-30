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
      val context = appContext.reactContext ?: return@Function
      
      // Gem til BootReceiver (hvis telefonen genstarter)
      val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
      prefs.edit().putLong("next_alarm", timestamp).apply()

      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(context, AlarmReceiver::class.java)
      val pendingIntent = PendingIntent.getBroadcast(
        context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      if (timestamp > System.currentTimeMillis()) {
        // AlarmClockInfo er den mest aggressive måde at vække Android på i Doze Mode
        val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, pendingIntent)
        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
      } else {
        alarmManager.cancel(pendingIntent) // Aflys alarm hvis tid = 0
      }
    }

    Function("stopAlarm") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, AlarmService::class.java)
      context.stopService(intent)
    }
  }
}