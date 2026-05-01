package nyvia.rise.module

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class AlarmScreenActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Den magiske kode, der smadrer igennem låseskærmen og tænder lyset!
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // 2. Vi bygger en lynhurtig, simpel brugergrænseflade direkte i koden
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#121212")) // Mørk baggrund
            setPadding(50, 50, 50, 50)
        }

        val title = TextView(this).apply {
            text = "NYVIARISE 🌅"
            textSize = 32f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 60)
        }

        val subtitle = TextView(this).apply {
            text = "Tid til at vågne!\nMusikken stopper først, når du scanner din kode."
            textSize = 18f
            setTextColor(Color.parseColor("#AAAAAA"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 100)
        }

        val scanButton = Button(this).apply {
            text = "ÅBN SCANNER"
            textSize = 20f
            setBackgroundColor(Color.parseColor("#4CAF50"))
            setTextColor(Color.WHITE)
            setPadding(40, 40, 40, 40)
            
            // 3. Når du trykker på knappen, kaster vi dig ind i React Native appen
            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                if (launchIntent != null) {
                    startActivity(launchIntent)
                }
                // Luk denne låseskærm (men lyden spiller videre fra Servicen!)
                finish() 
            }
        }

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(scanButton)

        setContentView(layout)
    }
}