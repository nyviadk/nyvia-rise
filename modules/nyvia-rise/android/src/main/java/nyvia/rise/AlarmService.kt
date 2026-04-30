package nyvia.rise

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class AlarmService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 1. Opret en notifikation (Kritisk for at Android tillader os at køre i baggrunden)
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, "NyviaRiseChannel")
            .setContentTitle("NyviaRise Alarm")
            .setContentText("Stå op og scan QR-koden på badeværelset!")
            .setSmallIcon(applicationInfo.icon) // Bruger dit app-ikon
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()
        
        startForeground(1, notification)

        // 2. Tving skærmen til at tænde (WakeLock)
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "NyviaRise::AlarmWakeLock"
        )
        wakeLock?.acquire(10 * 60 * 1000L) // Holder skærmen tændt i max 10 minutter

        // 3. Start lyden (Ingen snooze!)
        mediaPlayer = MediaPlayer()
        try {
            // Lige nu bruger vi telefonens standard alarm-lyd. Senere kan vi pege på din egen lydfil.
            val defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            mediaPlayer?.setDataSource(this, defaultRingtoneUri)
            
            mediaPlayer?.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM) // Sørger for at den ignorerer lydløs-tilstand
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            mediaPlayer?.isLooping = true // Uendeligt loop
            mediaPlayer?.prepare()
            mediaPlayer?.start()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // START_STICKY betyder at hvis Android dræber processen pga. manglende RAM, genstarter den med det samme
        return START_STICKY 
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "NyviaRiseChannel",
                "NyviaRise Alarm",
                NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}