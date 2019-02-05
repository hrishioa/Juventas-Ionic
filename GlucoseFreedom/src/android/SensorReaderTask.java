package cordova.plugin.glucosefreedom;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Calendar;
import java.util.TimeZone;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.IntentFilter.MalformedMimeTypeException;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.MediaPlayer.OnCompletionListener;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.NfcA;
import android.nfc.tech.NfcB;
import android.nfc.tech.NfcBarcode;
import android.nfc.tech.NfcF;
import android.nfc.tech.NfcV;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Vibrator;
import android.util.Log;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import android.preference.PreferenceManager;
import android.content.SharedPreferences;

public class SensorReaderTask extends AsyncTask<Tag, Void, JSONObject> {

    private static final String TAG = "SensorReaderTask";
    public boolean scanDataValid = false;
    public Map scanData;

    public String lastSensorID = "";
    public long lastReadTime = 0;
    public int lastTVal = 0;
    public int lastDenseGVal = 0;
    public int lastDenseTVal = 0;
    public int lastSparseTVal = 0;
    public int lastSparseGVal = 0;
    public int lastSensorTime = 0;

    private GlucoseFreedom callerGF;

    public SensorReaderTask(GlucoseFreedom callerGF) {
        this.callerGF = callerGF;
    }

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

    private boolean getLastSensorData() {
        SharedPreferences mPrefs = PreferenceManager.getDefaultSharedPreferences(callerGF.getActivity());
        boolean preferencesSet = mPrefs.getBoolean("preferences_set", false);
        if(preferencesSet == false)
            return false;
        this.lastSensorID = mPrefs.getString("lastSensorID","");
        this.lastSensorTime = mPrefs.getInt("lastSensorTime",0);        
        this.lastReadTime = mPrefs.getLong("lastReadTime",0);
        this.lastDenseTVal = mPrefs.getInt("lastDenseTVal",0);
        this.lastDenseGVal = mPrefs.getInt("lastDenseGVal",0);
        this.lastSparseTVal = mPrefs.getInt("lastSparseTVal",0);
        this.lastSparseGVal = mPrefs.getInt("lastSparseGVal",0);

        return true;
    }

    private void setLastSensorData() {
        SharedPreferences mPrefs = PreferenceManager.getDefaultSharedPreferences(callerGF.getActivity());
        SharedPreferences.Editor editor = mPrefs.edit();
        editor.putBoolean("preferences_set", true); // Storing boolean - true/false

        editor.putString("lastSensorID", this.lastSensorID);  
        editor.putInt("lastSensorTime", this.lastSensorTime);       
        editor.putLong("lastReadTime", this.lastReadTime);
        editor.putInt("lastDenseTVal", this.lastDenseTVal);  
        editor.putInt("lastDenseGVal", this.lastDenseGVal);  
        editor.putInt("lastSparseTVal", this.lastSparseTVal); 
        editor.putInt("lastSparseGVal", this.lastSparseGVal); 

        editor.commit();
    }

    private static Float processGlucose(int rawVal) {
        Float processedGlucose = ((rawVal & 0x0FFF) / 6f) - 37f;
        processedGlucose = ((processedGlucose*1.088f)-9.2f)/18;
        // second set of corrections
        processedGlucose = (processedGlucose*0.6141f)+0.8847f;
        return processedGlucose;
    }

    private static Float processTemp(int rawVal) {
        Float processedTime = ((rawVal & 0x2FFF)*( -0.001972f))+43.17f;
        return processedTime;
    }

    public static String getSensorID(String tagID) {
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


    private String getBlock(NfcV nfcTag, int blockNo) throws java.io.IOException {
        // TODO: Implement time benchmarking

        if(scanDataValid==false) {
            scanData = new HashMap<Integer,String>();
            scanDataValid = true;
        }

        if(scanData.containsKey(blockNo)) {
            return (String)scanData.get(blockNo);
        }

        byte [] cmd = new byte[]{
                (byte) 0x20, // Flags
                (byte) 0x20, // Command: Read multiple blocks
                0,0,0,0,0,0,0,0,
                (byte) (blockNo+3) // block (offset)
            };
            System.arraycopy(nfcTag.getTag().getId(),0,cmd,2,8);

            String readPosString = bytesToHex(Arrays.copyOfRange(nfcTag.transceive(cmd),1,9));

            scanData.put(blockNo, readPosString);

            Log.d(TAG,blockNo+": got Block "+readPosString);

            return readPosString;
        }

        private int getReadPosition(NfcV nfcTag, boolean dense) throws java.io.IOException {
            String readPosString = getBlock(nfcTag, 0);

            if(dense)
                return (Integer.parseInt(readPosString.substring(4, 6), 16)-1+16)%16;
            else
                return (Integer.parseInt(readPosString.substring(6, 8), 16)-1+32)%32;
        }

        // Time since sensor start in minutes
        private int timeSinceStart(NfcV nfcTag) throws java.io.IOException {
            int startpos = 584;
            String block = getBlock(nfcTag, startpos/16);
            int blockpos = startpos%16;
            String timehex = block.substring(blockpos+2,blockpos+4)+block.substring(blockpos,blockpos+2);
            int sTime = Integer.parseInt(timehex, 16);
//            Log.d(TAG,"Read timehex as "+block.substring(blockpos,blockpos+4)+", time is "+sTime);
            return sTime;
        }

        private int[] getValues(NfcV nfcTag, int valueNo, boolean dense) throws java.io.IOException {
            int offset = dense ? 8 : 200;
            int blockNo  = (Math.round(((valueNo*12)+offset)/16));
            int blockPosition = (Math.round(((valueNo*12)+offset)%16));

            String block = getBlock(nfcTag, blockNo);

            if(blockPosition+10 > 11) {
                block += getBlock(nfcTag, (blockNo + 1));
            }

            int rawGlucose = Integer.parseInt(block.substring(blockPosition+2,blockPosition+4)+block.substring(blockPosition,blockPosition+2),16);
            int rawTemp = Integer.parseInt(block.substring(blockPosition+8,blockPosition+10)+block.substring(blockPosition+6,blockPosition+8),16);

            Log.d(TAG, "Temperature value read - "+rawTemp+", from hex "+
                block.substring(blockPosition+8,blockPosition+10)+block.substring(blockPosition+6,blockPosition+8)+
                " - full Hex - "+block);

            return new int[]{rawGlucose,rawTemp};
        }

        @Override
        protected JSONObject doInBackground(Tag... params) {
            Log.d(TAG, "SensorReader starting...");

            scanDataValid = false;

            Log.d(TAG, "Reading sharedpreferences...");
            Boolean prefsSet = this.getLastSensorData();

            Tag tag = params[0];
            NfcV nfcvTag = NfcV.get(tag);

            String sensorID = getSensorID(bytesToHex(tag.getId()));
            JSONObject returnValues = new JSONObject();

            try {
                returnValues.put("sensorID", sensorID);
            } catch (JSONException e) {
                Log.d(TAG, "JSON Exception writing values - "+e.getMessage());
            }


            Log.d(TAG, "Got Sensor ID "+sensorID);

            try {
                nfcvTag.connect();
            } catch (IOException e) {
                Log.d(TAG, "Error opening NFC Connection!");

                return null;
            }            

            try {
            // Primary reading goes on here
                int tStart = timeSinceStart(nfcvTag)*60;

                long curTime = System.currentTimeMillis()/1000;
                double startTime = System.currentTimeMillis();

                int newreadpos = getReadPosition(nfcvTag, true);
                int oldreadpos = getReadPosition(nfcvTag, false);

                Log.d(TAG, "Current Time  - "+curTime);
                Log.d(TAG, "Calendar Time - "+(((Calendar.getInstance()).getTimeInMillis())/1000));
                Log.d(TAG, "Date Time     - "+(Calendar.getInstance(TimeZone.getDefault()).getTime().getTime()));
                Log.d(TAG, "Sensor started: "+(tStart/(60*60*24))+" days, "+((tStart/(60*60))%24)+" hours, "+((tStart/60)%(60))+" minutes.");
                Log.d(TAG, "Newreadpos - "+newreadpos+", Oldreadpos - "+oldreadpos);

                if(prefsSet && this.lastSensorID.equals(sensorID) && tStart == this.lastSensorTime)  {
                    Log.d(TAG, "Sensor doesn't have any new data.");
                    this.lastReadTime = curTime;
                    this.setLastSensorData();
                    return returnValues;
                }

                List<int[]> denseVals = new ArrayList<int[]>();
                for(int i=newreadpos+16;i>newreadpos;i--) {
                    int[] tmpVals = getValues(nfcvTag, i%16, true);
                    if(prefsSet && this.lastDenseGVal == tmpVals[0] && this.lastDenseTVal == tmpVals[1]) {
                        Log.d(TAG, "Cutting dense reading short with "+denseVals.size()+" values.");
                        break;
                    }

                    denseVals.add(tmpVals);
                }

                Log.d(TAG, "Read "+denseVals.size()+" new dense values.");

                List<int[]> sparseVals = new ArrayList<int[]>();

                for(int i=oldreadpos+32;i>oldreadpos;i--) {
                    int[] tmpVals = getValues(nfcvTag, i%32, false);

                    if(prefsSet && this.lastSparseGVal == tmpVals[0] && this.lastSparseTVal == tmpVals[1]) {
                        Log.d(TAG, "Cutting sparse reading short with "+sparseVals.size()+" values.");
                        break;
                    }

                    // if(lastSparseRecord != null) {
                    //     Log.d(TAG, "Comparing " + lastSparseRecord[0] + " and " + tmpVals[0] + ", also " + lastSparseRecord[1] + " and " + tmpVals[1] + ".");
                    //     if (Integer.parseInt(lastSparseRecord[0]) == tmpVals[0] && Integer.parseInt(lastSparseRecord[1]) == tmpVals[1])
                    //         break;
                    // }
                    sparseVals.add(tmpVals);
                }
                Log.d(TAG, "Read "+sparseVals.size()+" new sparse values.");

                Log.d(TAG, "Writing preferences...");
                this.lastSensorID = sensorID;
                this.lastSensorTime = tStart;        
                this.lastReadTime = curTime;
                if(denseVals.size() > 0) {
                    this.lastDenseGVal = denseVals.get(0)[0];
                    this.lastDenseTVal = denseVals.get(0)[1];
                }
                if(sparseVals.size() > 0) {
                   this.lastSparseGVal = sparseVals.get(0)[0];
                    this.lastSparseTVal = sparseVals.get(0)[1];
                }

                this.setLastSensorData();

                Log.d(TAG, "Wrote Preferences...");

                Log.d(TAG, "Writing to JSON...");

                JSONArray denseGRaw = new JSONArray();
                JSONArray sparseGRaw = new JSONArray();
                JSONArray denseTRaw = new JSONArray();
                JSONArray sparseTRaw = new JSONArray();
                JSONArray denseTVals = new JSONArray();
                JSONArray sparseTVals = new JSONArray();
                JSONArray denseGVals = new JSONArray();
                JSONArray sparseGVals = new JSONArray();
                JSONArray denseTimestamps = new JSONArray();
                JSONArray sparseTimestamps = new JSONArray();

                for(int i=0;i<denseVals.size();i++) {
                    denseGRaw.put(denseVals.get(i)[0]);
                    denseTRaw.put(denseVals.get(i)[1]);
                    denseGVals.put(processGlucose(denseVals.get(i)[0]));
                    denseTVals.put(processTemp(denseVals.get(i)[1]));
                    denseTimestamps.put(curTime - (i*60));
                }
                for(int i=0;i<sparseVals.size();i++) {
                    sparseGRaw.put(sparseVals.get(i)[0]);
                    sparseTRaw.put(sparseVals.get(i)[1]);
                    sparseGVals.put(processGlucose(sparseVals.get(i)[0]));
                    sparseTVals.put(processTemp(sparseVals.get(i)[1]));
                    sparseTimestamps.put(curTime - (i*60));
                }

                returnValues.put("sensorTime", tStart);
                returnValues.put("readTime", curTime);
                returnValues.put("denseGVals",    denseGVals);
                returnValues.put("sparseGVals",   sparseGVals);
                returnValues.put("denseTVals",    denseTVals);
                returnValues.put("sparseTVals",   sparseTVals);
                returnValues.put("denseGRaw",    denseGRaw);
                returnValues.put("sparseGRaw",   sparseGRaw);
                returnValues.put("denseTRaw",    denseTRaw);
                returnValues.put("sparseTRaw",   sparseTRaw);
                returnValues.put("denseTimestamps", denseTimestamps);
                returnValues.put("sparseTimestamps", sparseTimestamps);

            } catch (IOException e) {
                Log.d(TAG, "Error reading NFC - "+e.getMessage());
            } catch (JSONException e) {
                Log.d(TAG, "JSON Exception writing values - "+e.getMessage());
            }

            try {
                nfcvTag.close();
            } catch (IOException e) {
                Log.d(TAG, "Error closing NFC Connection!");
            }

            return returnValues;
        }

        @Override
        protected void onPostExecute(JSONObject result) {
            callerGF.sendEvent(GlucoseFreedom.SENSOR_TAG, result);
        }

    }