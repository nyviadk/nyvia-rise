package nyvia.rise

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NyviaRiseModule : Module() {
  override fun definition() = ModuleDefinition {
    // Navnet vi bruger i TypeScript
    Name("NyviaRise")

    // Kaldes fra appen for at oprette alarmen
    Function("scheduleAlarm") { timestamp: Long ->
      val context = appContext.reactContext ?: return@Function
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      
      val intent = Intent(context, AlarmReceiver::class.java)
      val pendingIntent = PendingIntent.getBroadcast(
        context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      // Tvinger Android ud af "Doze Mode"
      val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, pendingIntent)
      alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
    }

    // Kaldes fra appen når QR-koden scannes
    Function("stopAlarm") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, AlarmService::class.java)
      context.stopService(intent)
    }
  }
}