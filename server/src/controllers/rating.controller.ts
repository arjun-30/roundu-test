// EXISTING — create(+triggers cashback), listByProvider, getByBooking
    });
  } catch (error: any) {
  console.error('Get provider ratings error:', error);
  res.status(500).json({ success: false, message: 'Server error', error: error?.message });
}
};
