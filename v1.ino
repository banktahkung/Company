#define S0 16  // Frequency scaling pin RX1
#define S1 17  // Frequency scaling pin TX1
#define S2 18  // Photodiode selection pin D18
#define S3 19  // Photodiode selection pin D19
#define sensorOut 4  // Output pin for frequency reading D4

/* Enter the Minimum and Maximum Values obtained from Calibration */
int R_Min = 4;  /* Red minimum value */
int R_Max = 41; /* Red maximum value */
int G_Min = 4;  /* Green minimum value */
int G_Max = 40; /* Green maximum value */
int B_Min = 3;  /* Blue minimum value */
int B_Max = 43; /* Blue maximum value */

/* Define variables */
int Red = 0;
int Green = 0;
int Blue = 0;

int redValue;
int greenValue;
int blueValue;
int Frequency;

void setup() {
  pinMode(S2, OUTPUT);        /* Define S2 Pin as OUTPUT */
  pinMode(S3, OUTPUT);        /* Define S3 Pin as OUTPUT */
  pinMode(sensorOut, INPUT);  /* Define Sensor Output Pin as INPUT */
  Serial.begin(115200);       /* Set baudrate to 115200 */
  delay(1000);                /* Wait for 1000ms */
}

/* Convert RGB values to Hex String */
String RGBToHex(int r, int g, int b) {
  // Ensure RGB values are within valid range
  r = constrain(r, 0, 255);
  g = constrain(g, 0, 255);
  b = constrain(b, 0, 255);
  
  return String("#") + String(r, HEX) + String(g, HEX) + String(b, HEX);
}

/* Classify the color based on RGB values */
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
  } else if (b > r && b >= g && b > 160 && r + g + b < 430 && abs(b - g) >= 20) {
    if (b - r <= 65) {
      return "Purple";
    } else if (r < 70) {
      return "Blue";
    } else {
      return "Nothing";
    }
  } else {
    return "Nothing";
  }
}

/* Function to get RGB values in one go */
void getRGB() {
  // Read Red
  digitalWrite(S2, LOW);
  digitalWrite(S3, LOW);
  Red = pulseIn(sensorOut, LOW);

  // Read Green
  digitalWrite(S2, HIGH);
  digitalWrite(S3, HIGH);
  Green = pulseIn(sensorOut, LOW);

  // Read Blue
  digitalWrite(S2, LOW);
  digitalWrite(S3, HIGH);
  Blue = pulseIn(sensorOut, LOW);
}

void loop() {
  // Get RGB values
  getRGB();
  
  // Map the values to 0-255 range
  redValue = map(Red, R_Min, R_Max, 255, 0);
  greenValue = map(Green, G_Min, G_Max, 255, 0);
  blueValue = map(Blue, B_Min, B_Max, 255, 0);

  // Classify the color based on the RGB values
  String classifiedColor = classifyColor(redValue, greenValue, blueValue);

  // Skip printing if the color is green or red
  if (classifiedColor == "Green" || classifiedColor == "Red" || classifiedColor == "Nothing") {
    return;  
  }

  // Print the RGB values
  Serial.print("Red = ");
  Serial.print(redValue);
  Serial.print("    Green = ");
  Serial.print(greenValue);
  Serial.print("    Blue = ");
  Serial.println(blueValue);

  // Convert to Hex and print
  String hexColor = RGBToHex(redValue, greenValue, blueValue);
  Serial.print("Hex Color Code: ");
  Serial.println(hexColor);

  // Print the identified color
  Serial.print("Identified Color: ");
  Serial.println(classifiedColor);

  delay(15);  // Adjust as necessary based on your timing requirements
}
