package com.getcapacitor.myapp;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView for mobile-friendly responsive view
        setupWebViewForMobile();
    }
    
    private void setupWebViewForMobile() {
        // Get the WebView from Capacitor bridge
        WebView webView = getBridge().getWebView();
        
        if (webView != null) {
            // Mobile-friendly settings
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setSupportZoom(true);
            webView.getSettings().setBuiltInZoomControls(false);
            webView.getSettings().setDisplayZoomControls(false);
            
            // Use mobile user agent
            String mobileUserAgent = webView.getSettings().getUserAgentString();
            webView.getSettings().setUserAgentString(mobileUserAgent);
            
            // Enable responsive layout
            webView.getSettings().setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);
            
            // Enable hardware acceleration for smooth animations
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            
            // Enable JavaScript and DOM storage
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
            
            // Allow responsive design to work properly
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowContentAccess(true);
        }
    }
}
