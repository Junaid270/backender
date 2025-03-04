import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const express = require("express");
const app = express();
const router = express.Router();

// Notification configuration API endpoint
router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, data } = req.body;
    
    // Configure notification settings
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      },
      trigger: { seconds: 10 },
    });

    res.status(200).json({ 
      success: true, 
      message: "Notification scheduled successfully" 
    });
  } catch (error) {
    console.error("Error scheduling notification:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to schedule notification" 
    });
  }
});

// Get notification configuration
router.get("/config", (req, res) => {
  res.json({
    notificationSettings: {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: "high"
    }
  });
});

app.use("/notifications", router);

app.listen(3000, () => console.log("Backend running on port 3000"));

export const configureNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#235DFF",
    });
  }

  return true;
};
