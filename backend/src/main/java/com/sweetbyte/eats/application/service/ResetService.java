package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.User;

// Operator "Reset" (R-DASH): returns the simulator to the initial state of the seed configuration file.
public interface ResetService {

    void resetSystem(User user);
}
