package cordova.plugin.glucosefreedom;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.nfc.NfcAdapter;
import android.content.Intent;
import android.app.Activity;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.IntentFilter.MalformedMimeTypeException;
import android.net.Uri;
import android.nfc.FormatException;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.NfcEvent;
import android.nfc.Tag;
import android.nfc.TagLostException;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.nfc.tech.TagTechnology;
import android.os.Bundle;
import android.os.Parcelable;
import android.util.Log;
import android.nfc.tech.NfcV;
import java.util.Timer;
import java.util.TimerTask;

/**
 * This class echoes a string called from JavaScript.
 */
public class GlucoseFreedom extends CordovaPlugin {

    private static final String NO_NFC_CAPABILITY = "No NFC Capability";
    private static final String NFC_DISABLED = "NFC Disabled";
    private static final String NFC_ENABLED = "NFC Enabled";
    private static final String TAG = "GlucoseFreedom";
    private static final String NFCV_TAG = "NfcV";
    public static final  String SENSOR_TAG = "Sensor";

    public String sensorID = "";
    public int gValSparse=0, tValSparse=0, gValDense=0, tValDense=0;

    private PendingIntent pendingIntent = null;
    private Intent savedIntent = null;

    private CallbackContext eventChannel = null;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("coolMethod")) {
            String message = args.getString(0);
            this.coolMethod(message, callbackContext);
        } else if(action.equals("checkNFC")) {
            String NFCStatus = checkNFC();
            if(NFCStatus == NFC_ENABLED)
                callbackContext.success(NFCStatus);
            else
                callbackContext.error(NFCStatus);
        } else if(action.equals("startNFC")) {
            startNFC();
            callbackContext.success();
        } else if(action.equals("stopNFC")) {
            stopNFC();
            callbackContext.success();
        } else if(action.equals("setEventChannel")) {
            eventChannel = callbackContext;
        } else if(action.equals("fireTimedEvents")) {
            this.fireTimedEvents(args.getString(0), callbackContext);
        } else if(action.equals("init")) {
            this.init(callbackContext);
        }
        return true;
    }

    private void setLastSensor(String sensorID, int gValSparse, int tValSparse, int gValDense, int tValDense) {
        Log.d(TAG, "Logging sensor - "+sensorID);
        
    }

    private void fireTimedEvents(String message, CallbackContext callbackContext) {
        Log.d(TAG, "Will fire timed events with message "+message);

        TimerTask t = new TimerTask() {
            public void run() {
                Log.d(TAG, message);

                try {
                    JSONObject event = new JSONObject();
                    event.put("type", "timingTester");
                    event.put("tag", message);

                    PluginResult result = new PluginResult(PluginResult.Status.OK, event);
                    result.setKeepCallback(true);
                    eventChannel.sendPluginResult(result);
                } catch (JSONException e) {
                    Log.e(TAG, "Error sending NFC event through the channel", e);
                }

                //use a handler to run a toast that shows the current timestamp
                // handler.post(new Runnable() {
                //     public void run() {
                //         //get the current timeStamp
                //         Calendar calendar = Calendar.getInstance();
                //         SimpleDateFormat simpleDateFormat = new SimpleDateFormat("dd:MMMM:yyyy HH:mm:ss a");
                //         final String strDate = simpleDateFormat.format(calendar.getTime());

                //         //show the toast
                //         int duration = Toast.LENGTH_SHORT;  
                //         Toast toast = Toast.makeText(getApplicationContext(), strDate, duration);
                //         toast.show();
                //     }
                // });
            }
        };

        (new Timer()).schedule(t, 2000, 1000);

        callbackContext.success();
    }

    private void coolMethod(String message, CallbackContext callbackContext) {
        if (message != null && message.length() > 0) {
            callbackContext.success(message);
        } else {
            callbackContext.error("Expected one non-empty string argument.");
        }
    }

    public Activity getActivity() {
        return this.cordova.getActivity();
    }

    private Intent getIntent() {
        return getActivity().getIntent();
    }

    private void setIntent(Intent intent) {
        getActivity().setIntent(intent);
    }

    private String checkNFC() {
        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        if (nfcAdapter == null)
            return NO_NFC_CAPABILITY;
        else if (!nfcAdapter.isEnabled())
            return NFC_DISABLED;
        else {
            return NFC_ENABLED;
        }
    }

    private void init(CallbackContext callbackContext) {
        Log.d(TAG, "Enabling plugin " + getIntent());

        startNFC();
        if (!recycledIntent()) {
            handleIntent();
        }
        callbackContext.success();
    }

    private boolean recycledIntent() { // TODO this is a kludge, find real solution
        int flags = getIntent().getFlags();
        if ((flags & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) == Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) {
            Log.i(TAG, "Launched from history, killing recycled intent");
            setIntent(new Intent());
            return true;
        }
        return false;
    }

    private void createPendingIntent() {
        Log.w(TAG, "CreatePending Intent running...");
        if (pendingIntent == null) {
            Activity activity = getActivity();
            Intent intent = new Intent(activity, activity.getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            pendingIntent = PendingIntent.getActivity(activity, 0, intent, 0);
            Log.w(TAG, "Created pendingIntent - "+pendingIntent);
        }
    }

    private PendingIntent getPendingIntent() {
        return pendingIntent;
    }

    public void sendEvent(String type, JSONObject tag) {
        try {
            JSONObject event = new JSONObject();
            event.put("type", type);       // TAG_DEFAULT, NDEF, NDEF_MIME, NDEF_FORMATABLE
            event.put("tag", tag);         // JSON representing the NFC tag and NDEF messages

            PluginResult result = new PluginResult(PluginResult.Status.OK, event);
            result.setKeepCallback(true);
            eventChannel.sendPluginResult(result);
        } catch (JSONException e) {
            Log.e(TAG, "Error sending NFC event through the channel", e);
        }
    }

    private void startNFC() {
        Log.w(TAG, "startNFC Running...");
        createPendingIntent(); // onResume can call startNfc before execute
        Log.w(TAG, "pendingIntent Created.");

        getActivity().runOnUiThread(() -> {
            NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());

            if (nfcAdapter != null && !getActivity().isFinishing()) {
                Log.w(TAG, "nfcAdapter is not null and Activity is not finishing.");
                try {
                    IntentFilter[] intentFilters = new IntentFilter[] {
                        new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
                    };
                    String[][] techLists = new String[][] {
                        new String[] { NfcV.class.getName() },
                    };

                    // don't start NFC unless some intent filters or tech lists have been added,
                    // because empty lists act as wildcards and receives ALL scan events
                    if (intentFilters.length > 0 || techLists.length > 0) {
                        Log.w(TAG, "Enabling foregroundDispatch...");
                        nfcAdapter.enableForegroundDispatch(getActivity(), getPendingIntent(), intentFilters, techLists);
                        Log.w(TAG, "Enabled.");
                    }

                    // if (p2pMessage != null) {
                    //     nfcAdapter.setNdefPushMessage(p2pMessage, getActivity());
                    // }
                } catch (IllegalStateException e) {
                    // issue 110 - user exits app with home button while nfc is initializing
                    Log.w(TAG, "Illegal State Exception starting NFC. Assuming application is terminating.");
                }

            }
        });
    }

    private void stopNFC() {
        Log.d(TAG, "stopNfc called.");
        getActivity().runOnUiThread(() -> {

            NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());

            if (nfcAdapter != null) {
                try {
                    nfcAdapter.disableForegroundDispatch(getActivity());
                    Log.d(TAG, "stopNFC Complete.");
                } catch (IllegalStateException e) {
                    // issue 125 - user exits app with back button while nfc
                    Log.w(TAG, "Illegal State Exception stopping NFC. Assuming application is terminating.");
                }
            }
        });
    }

    private void handleIntent() {
        Log.d(TAG, "Handling Intent...");
        Intent intent = getIntent();
        String action = intent.getAction();

        if(action == null) {
            return;
        }

        Log.d(TAG, "Action - "+action);

        Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);

        Log.d(TAG, "Got tag.");

        if(action.equals(NfcAdapter.ACTION_TECH_DISCOVERED)) { // Only thing we care about
            // Log.d(TAG, "Tech discovered. Broadcasting event...");

            // JSONObject tagJSON = new JSONObject();

            // try {
            //     tagJSON.put("id", byteArrayToJSON(tag.getId()));
            //     tagJSON.put("sensorID", getSensorID(bytesToHex(tag.getId())));
            // } catch (JSONException e) {
            //     Log.e(TAG, "Error saving tagID to tagJSON", e);
            // }

            // sendEvent(NFCV_TAG, tagJSON);

            // Log.d(TAG, "Sent Event.");

            Log.d(TAG, "Reading values...");
            new SensorReaderTask(this).execute(tag); //TODO: Not a good idea to circular reference, need to fix
        }
    }

    @Override
    public void onPause(boolean multitasking) {
        Log.d(TAG, "onPause " + getIntent());
        super.onPause(multitasking);
        if (multitasking) {
            // nfc can't run in background
            stopNFC();
        }
    }

    @Override
    public void onResume(boolean multitasking) {
        Log.d(TAG, "onResume " + getIntent());
        super.onResume(multitasking);
        startNFC();
    }

    @Override
    public void onNewIntent(Intent intent) {
        Log.d(TAG, "onNewIntent " + intent);
        super.onNewIntent(intent);
        setIntent(intent);
        savedIntent = intent;
        handleIntent();
    }

    static JSONArray byteArrayToJSON(byte[] bytes) {
        JSONArray json = new JSONArray();
        for (byte aByte : bytes) {
            json.put(aByte);
        }
        return json;
    }


    // Move everything after this to it's own object, FSLibre specific code
    final protected static char[] hexArray = "0123456789ABCDEF".toCharArray();

    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for ( int j = 0; j < bytes.length; j++ ) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = hexArray[v >>> 4];
            hexChars[j * 2 + 1] = hexArray[v & 0x0F];
        }
        return new String(hexChars);
    }

    public String getSensorID(String tagID) {
        int [] Is = new int[]{0,0,0,0,0,0};
        int [] Js = new int[]{0,0,0,0,0,0,0,0,0,0};
        final String l = "0123456789ACDEFGHJKLMNPQRTUVWXYZ";
        for(int i=0;i<Is.length;i++) {
            Is[i] = Integer.parseInt(tagID.substring(((6 - i) * 2)-2, ((6 - i) * 2)), 16) & 255;
        }

        Js[0] = (Is[0] >> 3);
        Js[1] = (((Is[0] & 7) << 2) | (Is[1] >> 6));
        Js[2] = ((Is[1] >> 1) & 31);
        Js[3] = (((Is[1] & 1) << 4) | (Is[2] >> 4));
        Js[4] = (((Is[3-1] & 15) << 1) | (Is[3] >> 7));
        Js[5] = ((Is[3] >> 2) & 31);
        Js[6] = (((Is[3] & 3) << 3) | (Is[4] >> 5));
        Js[7] = (Is[4] & 31);
        Js[8] = (Is[5] >> 3);
        Js[9] = ((Is[5] << 2) & 31);

        String sensorID = "";

        for(int i=0;i<Js.length;i++)
            sensorID+=l.charAt(Js[i]);

        return sensorID;
    }

}
