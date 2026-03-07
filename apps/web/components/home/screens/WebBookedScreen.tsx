"use client";

import { motion } from "motion/react";
import { CheckCircle, MapPin, Calendar, Users, Plane } from "lucide-react";
import { STEP3_TRIP_DETAILS } from "@travyl/shared";

export function WebBookedScreen() {
  return (
    <div className="flex-1 flex flex-col items-center bg-gradient-to-br from-green-50 via-blue-50 to-white overflow-hidden p-3">
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4, type: "spring", stiffness: 200 }}
        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mt-3 mb-1.5"
      >
        <CheckCircle size={20} className="text-white" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="text-[14px] font-bold text-gray-900 mb-0.5"
      >
        Trip Confirmed!
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.3 }}
        className="text-[9px] text-gray-500 mb-2.5"
      >
        Your Rome adventure awaits
      </motion.p>

      {/* Trip Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
        className="w-full bg-white rounded-lg shadow-md p-2.5 space-y-1.5"
      >
        {/* Destination Header */}
        <div className="pb-1.5 border-b border-gray-100">
          <div className="flex items-center gap-1 text-[#003594] mb-0.5">
            <MapPin size={10} />
            <span className="text-[10px] font-semibold">{STEP3_TRIP_DETAILS.destination}</span>
          </div>
          <p className="text-[11px] font-bold text-gray-900">{STEP3_TRIP_DETAILS.subtitle}</p>
        </div>

        {/* Trip Details */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Calendar size={10} className="text-[#1A5CC8] shrink-0" />
            <div>
              <p className="text-[7px] text-gray-400">Dates</p>
              <p className="text-[9px] font-semibold text-gray-800">{STEP3_TRIP_DETAILS.dates}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Users size={10} className="text-[#1A5CC8] shrink-0" />
            <div>
              <p className="text-[7px] text-gray-400">Travelers</p>
              <p className="text-[9px] font-semibold text-gray-800">{STEP3_TRIP_DETAILS.travelers}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Plane size={10} className="text-[#1A5CC8] shrink-0" />
            <div>
              <p className="text-[7px] text-gray-400">Flight</p>
              <p className="text-[9px] font-semibold text-gray-800">{STEP3_TRIP_DETAILS.flight}</p>
            </div>
          </div>
        </div>

        {/* Booking Reference */}
        <div className="pt-1.5 border-t border-gray-100">
          <p className="text-[7px] text-gray-400 mb-0.5">Booking Reference</p>
          <p className="text-[10px] font-bold text-gray-900 tracking-wider">{STEP3_TRIP_DETAILS.bookingRef}</p>
        </div>

        {/* Total Price */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-md p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium text-gray-600">Total Price</span>
            <span className="text-[13px] font-bold text-gray-900">{STEP3_TRIP_DETAILS.totalPrice}</span>
          </div>
        </div>
      </motion.div>

      {/* Action Button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.3 }}
        className="w-full mt-2 bg-[#003594] text-white py-1.5 rounded-lg text-[10px] font-semibold shadow-md"
      >
        View Full Itinerary
      </motion.button>

      {/* Confirmation Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.3 }}
        className="text-[8px] text-gray-400 mt-1.5"
      >
        Confirmation email sent to your inbox
      </motion.p>
    </div>
  );
}
