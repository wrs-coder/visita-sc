# Regras de otimização (R8) do Visita SC.
#
# O app é uma casca Capacitor: toda a lógica roda no WebView e as chamadas
# nativas passam pela ponte JavaScript. Por isso as classes de plugin e os
# métodos anotados NÃO podem ser renomeados nem removidos pelo R8.

# Mantém informação de linha para relatórios de falha legíveis no Play Console.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Anotações e a ponte JS precisam sobreviver à ofuscação.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepattributes JavascriptInterface

# ---------------------------------------------------------------
# Capacitor: núcleo, plugins e métodos expostos ao JavaScript
# ---------------------------------------------------------------
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Plugins Cordova embutidos pela ponte do Capacitor.
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# ---------------------------------------------------------------
# Plugins usados por este app
# ---------------------------------------------------------------
-keep class com.aparajita.capacitor.biometricauth.** { *; }
-keep class com.aparajita.capacitor.securestorage.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Biometria / segurança / WebKit
-keep class androidx.biometric.** { *; }
-dontwarn androidx.biometric.**
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**
-dontwarn androidx.webkit.**

# Reflexão usada por bibliotecas AndroidX comuns.
-keepclassmembers enum * { *; }
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Avisos inofensivos de dependências opcionais.
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
