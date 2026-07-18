package com.lifeos.sms

import java.security.MessageDigest

internal object HashUtils {
    private val HEX = "0123456789abcdef".toCharArray()

    fun sha256(input: String): String = try {
        val bytes = MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
        val sb = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            val i = b.toInt()
            sb.append(HEX[(i shr 4) and 0x0F])
            sb.append(HEX[i and 0x0F])
        }
        sb.toString()
    } catch (_: Exception) {
        input.hashCode().toString()
    }
}
