package nyvia.rise.module

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NyviaRiseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NyviaRise")

    Function("scheduleAlarm") { id: String, timestamp: Long ->
      val context = appContext.reactContext
      
      if (context != null) {
        val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong("next_alarm", timestamp)
            .putString("next_alarm_id", id)
            .apply()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        // 1. Intent til selve alarmafviklingen (vores receiver)
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "NYVIA_RISE_ALARM"
            putExtra("ALARM_ID", id)
        }

        val requestCode = id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
          context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 2. Intent til Quick Settings / låseskærm (åbner ur-appen)
        // Dette løser buggen, hvor alarmen gik i gang ved tryk i topmenuen
        val showIntent = Intent(AlarmClock.ACTION_SHOW_ALARMS)
        val showPendingIntent = PendingIntent.getActivity(
            context, 0, showIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (timestamp > System.currentTimeMillis()) {
          // Vi giver systemet showPendingIntent som det visuelle mål
          val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, showPendingIntent)
          alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
        }
      }
    }

    Function("cancelAlarm") { id: String ->
      val context = appContext.reactContext
      
      if (context != null) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "NYVIA_RISE_ALARM"
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
          context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
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

    Function("isAlarmActive") {
      return@Function AlarmService.isRinging
    }
  }
}