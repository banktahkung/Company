function SendingSignal(element) {
  let color = element.textContent.trim().split(" ")[1]; // Extract the color from the content

  switch (color) {
    case "Black":
      PostInfo("01");
      break;
    case "Blue":
      PostInfo("02");
      break;
    case "Purple":
      PostInfo("06");
      break;
    default:
      console.log("Unknown color:", color);
  }
}

async function PostInfo(content) {
  let destination = "/PostInformation"; // Ensure the correct endpoint is used
  let SendingMessage = { CartID: "001", Package: content };

  const CartIDInput = document.getElementById("CartIDInput");

  if (CartIDInput.value.trim() != "") {
    SendingMessage.CartID = CartIDInput.value;
  }

  try {
    const response = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Inform server that you're sending JSON
      },
      body: JSON.stringify(SendingMessage), // Convert the message object to a JSON string
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

  } catch (error) {
    console.error("Error sending information:", error);
  }
}

async function ResetInfo() {
  let destination = "ResetInformation";
  const content = { a: "a" };

  try {
    const response = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Inform server that you're sending JSON
      },
      body: JSON.stringify(content), // Convert the message object to a JSON string
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error sending information:", error);
  }
}

async function SendingCheck() {
  let destination = "/Checking";
  const content = { a: "a" };

  try {
    const response = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Inform server that you're sending JSON
      },
      body: JSON.stringify(content), // Convert the message object to a JSON string
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error sending information:", error);
  }
}
