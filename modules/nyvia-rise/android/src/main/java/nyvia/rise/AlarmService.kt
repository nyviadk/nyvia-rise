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
        var isRinging = false
    }

    private var mediaPlayer: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())
    private var volume = 0.01f
    private val maxVolume = 1.0f
    private val fadeDuration = 30000L
    private val fadeInterval = 500L
    private val volumeStep = maxVolume / (fadeDuration / fadeInterval)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        isRinging = true
        Log.d("NyviaRise", "AlarmService startet")

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "NyviaRise::WakeLock"
        )
        wakeLock?.acquire(10 * 60 * 1000L)

        createNotificationChannel()

        val fullScreenIntent = Intent(this, AlarmScreenActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or 
                     Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                     Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "nyviarise_alarm_channel")
            .setContentTitle("NyviaRise alarm 🌅")
            .setContentText("Tryk for at åbne scanneren!")
            .setSmallIcon(applicationInfo.icon)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, notification)
        }

        // BACKUP: Forsøg at starte skærmen direkte med det samme
        try {
            startActivity(fullScreenIntent)
        } catch (e: Exception) {
            Log.e("NyviaRise", "Kunne ikke starte activity direkte: ${e.message}")
        }

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
            setVolume(volume, volume)
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
                        handler.postDelayed(this, fadeInterval)
                    } else {
                        mediaPlayer?.setVolume(maxVolume, maxVolume)
                    }
                }
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        isRinging = false
        handler.removeCallbacksAndMessages(null)
        mediaPlayer?.stop()
        mediaPlayer?.release()
        wakeLock?.let { if (it.isHeld) it.release() }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "nyviarise_alarm_channel",
                "Vigtige alarmer",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Brugt til at vække dig om morgenen"
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}