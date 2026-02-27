#![no_std]

use core::alloc::{GlobalAlloc, Layout};

struct BumpAllocator {
    next: core::sync::atomic::AtomicUsize,
}

unsafe impl GlobalAlloc for BumpAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let size = layout.size();
        let align = layout.align();
        let current = self.next.load(core::sync::atomic::Ordering::Relaxed);
        let aligned = (current + align - 1) & !(align - 1);
        let new_next = aligned + size;
        self.next
            .store(new_next, core::sync::atomic::Ordering::Relaxed);
        aligned as *mut u8
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: Layout) {}
}

#[global_allocator]
static ALLOCATOR: BumpAllocator = BumpAllocator {
    next: core::sync::atomic::AtomicUsize::new(0x10000),
};
