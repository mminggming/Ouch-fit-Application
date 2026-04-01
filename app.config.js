import 'dotenv/config';

export default {
  expo: {
    name: "OuchFit",
    slug: "ouchfit",
    version: "1.0.0",
    orientation: "portrait",
    platforms: ["ios", "android"],
    icon: "./assets/images/icon.png",
    scheme: "ouchfit",
    userInterfaceStyle: "automatic",

    // ⚠️ ลบ newArchEnabled ออก (Expo บาง version ไม่รองรับ)

    ios: {
      supportsTablet: true,
      bundleIdentifier: "Chanita.OuchFit",
      googleServicesFile: "./GoogleService-Info.plist",
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      // ⚠️ ลบ edgeToEdgeEnabled (warning ในของคุณ)
      predictiveBackGestureEnabled: false,
      package: "Chanita.OuchFit",
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: "f410ef34-bf16-4db3-b8aa-084c8fa48139",
      },

      GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID,
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
    },

    owner: "ouchfitapp",
  },
};