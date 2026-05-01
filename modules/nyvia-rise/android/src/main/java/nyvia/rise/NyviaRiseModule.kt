package nyvia.rise.module

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NyviaRiseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NyviaRise")

    // Opdateret: Tager nu imod 'id' så vi kan skille alarmerne ad!
    Function("scheduleAlarm") { id: String, timestamp: Long ->
      val context = appContext.reactContext
      
      if (context != null) {
        // Gemmer både tid og ID, så BootReceiveren kan genoplive præcis denne alarm!
        val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong("next_alarm", timestamp)
            .putString("next_alarm_id", id)
            .apply()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        // Vi opsætter intentet PRÆCIS som vi tjekker for det i AlarmReceiver
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "NYVIA_RISE_ALARM"
            putExtra("ALARM_ID", id)
        }

        // VIGTIGT: id.hashCode() giver et unikt tal per alarm. 
        // Nu overskriver de ikke længere hinanden!
        val requestCode = id.hashCode()

        val pendingIntent = PendingIntent.getBroadcast(
          context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (timestamp > System.currentTimeMillis()) {
          val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp, pendingIntent)
          alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
        }
      }
    }

    // NY FUNKTION: Så vi kan slette en specifik alarm fra React Native
    Function("cancelAlarm") { id: String ->
      val context = appContext.reactContext
      
      if (context != null) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "NYVIA_RISE_ALARM"
        }
        
        // Vi finder den specifikke alarm via id.hashCode()
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