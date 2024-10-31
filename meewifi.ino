#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <stdlib.h>

#define S0 16  // Frequency scaling pin RX1
#define S1 17  // Frequency scaling pin TX1
#define S2 18  // Photodiode selection pin D18
#define S3 19  // Photodiode selection pin D19
#define sensorOut 4  // Output pin for frequency reading D4

/* Calibration values */
const int R_Min = 4, R_Max = 41;
const int G_Min = 4, G_Max = 40;
const int B_Min = 3, B_Max = 43;

/* RGB values */
int Red = 0, Green = 0, Blue = 0;
int redValue, greenValue, blueValue, Frequency;

/* WiFi credentials */
const char* ssid = "ByeHubZzz";
const char* password = "bank2549";

/* Server URL */
const char* serverUrl = "http://172.20.10.3:5001/PostInformation";

/* Sticker codes for each color */
const char* stickerCodes[] = {"01", "02", "03", "04", "05", "06"};

/* Function to get a corresponding sticker code based on the color tone */
const char* getStickerCode(const char* colorTone) {
  if (strcmp(colorTone, "Black") == 0) return stickerCodes[0];
  if (strcmp(colorTone, "Blue") == 0) return stickerCodes[1];
  if (strcmp(colorTone, "Red") == 0) return stickerCodes[2];
  if (strcmp(colorTone, "Yellow") == 0) return stickerCodes[3];
  if (strcmp(colorTone, "White") == 0) return stickerCodes[4];
  if (strcmp(colorTone, "Purple") == 0) return stickerCodes[5];
  return "";
}

void setup() {
  pinMode(S2, OUTPUT);        // S2 as OUTPUT
  pinMode(S3, OUTPUT);        // S3 as OUTPUT
  pinMode(sensorOut, INPUT);  // sensorOut as INPUT
  Serial.begin(115200);       // Serial baudrate
  
  connectToWiFi();  // Connect to Wi-Fi
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  unsigned long startAttemptTime = millis();
  
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi");
  } else {
    Serial.println("\nFailed to connect to WiFi. Rebooting...");
    ESP.restart();  // Restart if WiFi fails
  }
}

/* Convert RGB values to a Hex string */
void RGBToHex(char* buffer, int r, int g, int b) {
  snprintf(buffer, 8, "#%02X%02X%02X", constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
}

/* Restored classifyColor function */
String classifyColor(int r, int g, int b) {
  if (r > 210 && g > 210 && b > 215 || r + g + b > 720) {
    return "White";  // All values above 220, it's white
  }

  if (r < 80 && g < 80 && b < 140 && r + g + b > -500) {
    return "Black";  
  }

  if (g > r && g > b && g > 10) {
    return "Green";
  } else if (r > g && r > b && r > 150) {
    if (r - g <= 10) {
      return "Yellow"; 
    } else if (r - b <= 20) {
      return "Purple";  
    } else {
      return "Red";
    }
  } else if (b > r && b >= g && b > 140 && r + g + b < 475 && abs(b - g) >= 20) {
    if (b - r <= 65) {
      return "Purple";
    } else if (r < 90) {
      return "Blue";
    } else {
      return "Nothing";
    }
  } else {
    return "Nothing";
  }
}

void loop() {
  getRGB();  // Get RGB values
  
  char hexColor[8];
  RGBToHex(hexColor, redValue, greenValue, blueValue);
  Serial.printf("Hex Color: %s\n", hexColor);

  String classifiedColor = classifyColor(redValue, greenValue, blueValue);
  if (classifiedColor != "Nothing" && classifiedColor != "Green" && classifiedColor != "Red") {
    Serial.printf("%s detected. Sending data to server.\n", classifiedColor.c_str());
    const char* stickerCode = getStickerCode(classifiedColor.c_str());
    sendColorToServer(classifiedColor.c_str(), stickerCode);  // Convert String to const char*
  }

  delay(25);  // Small delay
}

/* Functions to get the frequency for Red, Green, and Blue color detection */
int getRed() {
  digitalWrite(S2, LOW); digitalWrite(S3, LOW);
  Frequency = pulseIn(sensorOut, LOW);
  return Frequency;
}

int getGreen() {
  digitalWrite(S2, HIGH); digitalWrite(S3, HIGH);
  Frequency = pulseIn(sensorOut, LOW);
  return Frequency;
}

int getBlue() {
  digitalWrite(S2, LOW); digitalWrite(S3, HIGH);
  Frequency = pulseIn(sensorOut, LOW);
  return Frequency;
}

void getRGB() {
  Red = getRed();  redValue = map(Red, R_Min, R_Max, 255, 0);
  Green = getGreen();  greenValue = map(Green, G_Min, G_Max, 255, 0);
  Blue = getBlue();  blueValue = map(Blue, B_Min, B_Max, 255, 0);
}

/* Send classified color to server */
void sendColorToServer(const char* colorTone, const char* stickerCode) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.setTimeout(2000);  // Set a 2-second timeout for the request

    http.begin(serverUrl);  // Specify the server URL
    http.addHeader("Content-Type", "application/json");  // Use JSON format

    // Create a JSON object
    StaticJsonDocument<128> jsonDoc;
    jsonDoc["CartID"] = "001";              // Set the CartID to "001"
    jsonDoc["Package"] = stickerCode;       // Set the Package to the classified color

    // Convert JSON object to string
    String jsonData;
    serializeJson(jsonDoc, jsonData);

    // Send the POST request
    int httpResponseCode = http.POST(jsonData);

    if (httpResponseCode > 0) {
      String response = http.getString();
      // Handle the server response if necessary
    } else {
      // Handle errors, possibly print httpResponseCode to debug
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

