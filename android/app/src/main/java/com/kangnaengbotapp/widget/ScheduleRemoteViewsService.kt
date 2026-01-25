package com.kangnaengbotapp.widget

import android.content.Intent
import android.widget.RemoteViewsService

class ScheduleRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return ScheduleRemoteViewsFactory(this.applicationContext)
    }
}
