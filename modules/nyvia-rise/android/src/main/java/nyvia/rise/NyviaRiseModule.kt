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
      
      // Vi bruger en simpel if-sætning for at undgå Kotlin's type-forvirring
      if (context != null) {
          val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
          val intent = Intent(context, AlarmReceiver::class.java)
          val pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )

          val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, pendingIntent)
          alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
      }
    }

    Function("stopAlarm") {
      val context = appContext.reactContext
      
      if (context != null) {
          val intent = Intent(context, AlarmService::class.java)
          context.stopService(intent)
      }
    }
  }
}