package com.example.driverapp

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var urlInput: EditText
    private lateinit var statusText: TextView
    private lateinit var locationText: TextView

    private var baseUrl = ""
    private val driverId = "driver1"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        urlInput = findViewById(R.id.urlInput)
        statusText = findViewById(R.id.statusText)
        locationText = findViewById(R.id.locationText)

        val startBtn = findViewById<Button>(R.id.startBtn)

        startBtn.setOnClickListener {
            baseUrl = urlInput.text.toString().trim()
            if (baseUrl.isEmpty()) {
                Toast.makeText(this, "Enter ngrok URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            requestLocationPermission()
        }
    }

    private fun requestLocationPermission() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                1
            )
        } else {
            startTracking()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startTracking()
        } else {
            statusText.text = "❌ Permission Denied"
        }
    }

    private fun startTracking() {
        statusText.text = "📡 Tracking..."

        val request = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            3000
        ).build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return

                val lat = location.latitude
                val lng = location.longitude

                locationText.text = "Lat: $lat\nLng: $lng"

                sendLocation(lat, lng)
            }
        }

        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.requestLocationUpdates(
                request,
                callback,
                mainLooper
            )
        }
    }

    private fun sendLocation(lat: Double, lng: Double) {
        Thread {
            try {
                val url = URL("$baseUrl/update-location")
                val conn = url.openConnection() as HttpURLConnection

                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true

                val json = JSONObject()
                json.put("driverId", driverId)
                json.put("lat", lat)
                json.put("lng", lng)

                val writer = OutputStreamWriter(conn.outputStream)
                writer.write(json.toString())
                writer.flush()

                val responseCode = conn.responseCode

                runOnUiThread {
                    statusText.text = "✅ Sent ($responseCode)"
                }

            } catch (e: Exception) {
                runOnUiThread {
                    statusText.text = "❌ Error: ${e.message}"
                }
            }
        }.start()
    }
}