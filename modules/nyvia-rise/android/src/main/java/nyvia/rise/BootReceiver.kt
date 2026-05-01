package nyvia.rise.module

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        
        // Vi tilføjer lige HTC's quickboot, bare for en sikkerheds skyld (nogle custom Android ROMs bruger den)
        if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON" || action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            Log.d("NyviaRise", "Telefon genstartet - forsøger at gendanne alarm...")

            val prefs = context.getSharedPreferences("nyviarise_prefs", Context.MODE_PRIVATE)
            val nextAlarmTime = prefs.getLong("next_alarm", 0)
            
            // Vi henter også ID'et nu! (Det skal vi sørge for at gemme, når vi opdaterer NyviaRiseModule.kt)
            val nextAlarmId = prefs.getString("next_alarm_id", "boot_restored_alarm")

            if (nextAlarmTime > System.currentTimeMillis()) {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                
                val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                    this.action = "NYVIA_RISE_ALARM" // VIGTIGT: Matcher den action, vi sikrede os imod i AlarmReceiver
                    putExtra("ALARM_ID", nextAlarmId) // Sørger for at den er 100% individuel
                }

                // Vi bruger et unikt request code (hashCode af ID) så Android ikke blander alarmer sammen
                val requestCode = nextAlarmId?.hashCode() ?: 0

                val pendingIntent = PendingIntent.getBroadcast(
                    context, 
                    requestCode, 
                    alarmIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // setAlarmClock er den absolut mest aggressive form for alarm i Android - perfekt til at slå Doze/Sleep mode!
                val alarmClockInfo = AlarmManager.AlarmClockInfo(nextAlarmTime, pendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                
                Log.d("NyviaRise", "Alarm gendannet! Tid: $nextAlarmTime, ID: $nextAlarmId")
            } else {
                Log.d("NyviaRise", "Ingen fremtidige alarmer at gendanne.")
            }
        }
    }
}