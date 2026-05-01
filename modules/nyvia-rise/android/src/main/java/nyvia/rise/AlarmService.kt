package nyvia.rise.module

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import android.util.Log

class AlarmService : Service() {
    companion object {
        // Denne variabel lader appen vide, om alarmen larmer lige nu!
        var isRinging = false
    }

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    
    // Variabler til fade-in logik (30 sekunder)
    private val handler = Handler(Looper.getMainLooper())
    private var volume = 0.01f
    private val maxVolume = 1.0f
    private val fadeDuration = 30000L // 30 sekunder
    private val fadeInterval = 500L // Opdaterer hvert halve sekund (500 ms)
    private val volumeStep = maxVolume / (fadeDuration / fadeInterval)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        isRinging = true
        Log.d("NyviaRise", "AlarmService startet - sætter isRinging = true")

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "NyviaRise::WakeLock"
        )
        wakeLock?.acquire(10 * 60 * 1000L) // Hold skærmen vågen i op til 10 min

        createNotificationChannel()

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "nyviarise_alarm_channel")
            .setContentTitle("Tid til at stå op! 🌅")
            .setContentText("Scan koden for at slukke alarmen.")
            .setSmallIcon(applicationInfo.icon)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true) 
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, notification)
        }

        if (launchIntent != null) {
            try {
                startActivity(launchIntent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Opsætning af MediaPlayer med fade-in
        val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        mediaPlayer = MediaPlayer().apply {
            setDataSource(this@AlarmService, alarmUri)
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            isLooping = true
            setVolume(volume, volume) // Start meget lavt
            prepare()
            start()
        }

        startFadeIn()

        return START_STICKY
    }

    private fun startFadeIn() {
        handler.post(object : Runnable {
            override fun run() {
                if (mediaPlayer?.isPlaying == true) {
                    volume += volumeStep
                    if (volume < maxVolume) {
                        mediaPlayer?.setVolume(volume, volume)
                        handler.postDelayed(this, fadeInterval) // Kør igen om 500ms
                    } else {
                        mediaPlayer?.setVolume(maxVolume, maxVolume) // Sikkerhedsnet: sæt til 100%
                    }
                }
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("NyviaRise", "AlarmService dør - slukker musik og rydder op")
        isRinging = false
        
        // Stop fade-in loopet, så vi ikke får memory leaks
        handler.removeCallbacksAndMessages(null)
        
        mediaPlayer?.stop()
        mediaPlayer?.release()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "nyviarise_alarm_channel",
                "NyviaRise Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                setBypassDnd(true) // Ignorer Forstyr Ikke
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}