// QUICK SELLER APPROVAL FIX - Run this in browser console
// This script fixes sellers who are approved but can't login due to status field mismatches

const BACKEND_URL = 'https://my-backend-1-jk7w.onrender.com';

async function quickSellerFix(sellerEmail) {
    console.log(`🔧 Fixing seller approval status for: ${sellerEmail}`);
    
    try {
        // Step 1: Check current status
        console.log('📊 Step 1: Checking current status...');
        const statusResponse = await fetch(`${BACKEND_URL}/api/debug/seller/${sellerEmail}`);
        const statusResult = await statusResponse.json();
        
        if (!statusResult.success) {
            console.error('❌ Seller not found:', statusResult.message);
            return;
        }
        
        const seller = statusResult.seller;
        console.log('📋 Current status:', {
            approvalStatus: seller.approvalStatus,
            status: seller.status,
            email: seller.email,
            businessName: seller.businessName
        });
        
        // Step 2: Fix the status
        console.log('🔧 Step 2: Fixing status fields...');
        const fixResponse = await fetch(`${BACKEND_URL}/api/debug/fix-seller-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: sellerEmail,
                approvalStatus: 'approved',
                status: 'approved'
            })
        });
        
        const fixResult = await fixResponse.json();
        
        if (fixResult.success) {
            console.log('✅ SUCCESS! Seller status fixed:', fixResult);
            console.log(`🎉 ${sellerEmail} should now be able to login!`);
        } else {
            console.error('❌ Fix failed:', fixResult.error);
        }
        
        // Step 3: Verify the fix
        console.log('🔍 Step 3: Verifying fix...');
        const verifyResponse = await fetch(`${BACKEND_URL}/api/debug/seller/${sellerEmail}`);
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.success) {
            const updatedSeller = verifyResult.seller;
            console.log('✅ Updated status:', {
                approvalStatus: updatedSeller.approvalStatus,
                status: updatedSeller.status,
                approvedAt: updatedSeller.approvedAt,
                approvedBy: updatedSeller.approvedBy
            });
            
            if (updatedSeller.approvalStatus === 'approved' && updatedSeller.status === 'approved') {
                console.log('🎉 SUCCESS! Both status fields are now "approved"');
            } else {
                console.log('⚠️ WARNING: Status fields may still be inconsistent');
            }
        }
        
    } catch (error) {
        console.error('🔥 Error during fix:', error);
    }
}

// Usage examples:
// quickSellerFix('seller@example.com');
// quickSellerFix('test.seller.1732671234567@example.com');

console.log('🔧 Quick Seller Fix loaded!');
console.log('📝 Usage: quickSellerFix("seller@example.com")');
console.log('');
console.log('🚀 Run this function with the seller\'s email to fix their login issue');

// Export for easy use
window.quickSellerFix = quickSellerFix;
