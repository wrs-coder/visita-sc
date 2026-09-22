package com.waorodrigues.visitasc;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // BridgeActivity troca o tema de abertura pelo tema definitivo. Limpa
        // também o drawable da Window explicitamente: em alguns aparelhos ele
        // permanecia em cache e reaparecia por instantes quando o teclado
        // redimensionava o WebView ou ao selecionar texto no editor.
        getWindow().setBackgroundDrawableResource(R.color.appWindowBackground);
    }
}
