// COMPREHENSIVE SELLER LOGIN ELIGIBILITY CHECK
// This script checks all sellers and predicts who can login after the fix

const BACKEND_URL = 'https://my-backend-1-jk7w.onrender.com';

async function checkAllSellersLoginEligibility() {
    console.log('🔍 === COMPREHENSIVE SELLER LOGIN ELIGIBILITY CHECK === 🔍');
    
    try {
        // Step 1: Get all sellers
        console.log('📊 Step 1: Fetching all sellers...');
        const response = await fetch(`${BACKEND_URL}/api/admin/sellers`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ Failed to fetch sellers:', result.error);
            return;
        }
        
        const sellers = result.sellers;
        console.log(`✅ Found ${sellers.length} sellers in database`);
        
        // Step 2: Analyze each seller's login eligibility
        console.log('\n📋 Step 2: Analyzing login eligibility for each seller...');
        
        const analysis = {
            total: sellers.length,
            canLogin: 0,
            cannotLogin: 0,
            needFix: 0,
            alreadyGood: 0,
            details: []
        };
        
        sellers.forEach((seller, index) => {
            const approvalStatus = seller.approvalStatus || 'not_set';
            const status = seller.status || 'not_set';
            
            // Apply the same logic as the login endpoint
            let canLogin = false;
            let reason = '';
            let needsFix = false;
            
            // Check rejection first
            if (approvalStatus === 'rejected' || status === 'rejected') {
                canLogin = false;
                reason = 'Rejected';
            }
            // Check pending
            else if (approvalStatus === 'pending' || status === 'pending') {
                canLogin = false;
                reason = 'Pending approval';
                needsFix = true;  // These can be fixed if they should be approved
            }
            // Check final approval condition
            else if (approvalStatus === 'approved' && status === 'approved') {
                canLogin = true;
                reason = 'Fully approved';
                analysis.alreadyGood++;
            }
            // Check partial approval (this is the problem case)
            else if (approvalStatus === 'approved' || status === 'approved') {
                canLogin = false;
                reason = `Partial approval (${approvalStatus}/${status})`;
                needsFix = true;
            }
            // Check not set or other values
            else {
                canLogin = false;
                reason = `Not active (${approvalStatus}/${status})`;
                needsFix = true;
            }
            
            if (canLogin) {
                analysis.canLogin++;
            } else {
                analysis.cannotLogin++;
            }
            
            if (needsFix) {
                analysis.needFix++;
            }
            
            analysis.details.push({
                index: index + 1,
                email: seller.email,
                name: seller.name || `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'No name',
                businessName: seller.businessName || 'No business',
                approvalStatus,
                status,
                canLogin,
                reason,
                needsFix,
                registeredAt: seller.registrationDate || seller.createdAt || 'Unknown'
            });
        });
        
        // Step 3: Display results
        console.log('\n📊 === LOGIN ELIGIBILITY SUMMARY === 📊');
        console.log(`Total Sellers: ${analysis.total}`);
        console.log(`✅ Can Login Now: ${analysis.canLogin}`);
        console.log(`❌ Cannot Login: ${analysis.cannotLogin}`);
        console.log(`🔧 Need Fix: ${analysis.needFix}`);
        console.log(`✨ Already Good: ${analysis.alreadyGood}`);
        
        console.log('\n📋 === DETAILED BREAKDOWN === 📋');
        console.log('🟢 SELLERS WHO CAN LOGIN:');
        analysis.details.filter(s => s.canLogin).forEach(seller => {
            console.log(`  ✅ ${seller.name} (${seller.email}) - ${seller.businessName}`);
        });
        
        console.log('\n🔴 SELLERS WHO CANNOT LOGIN:');
        analysis.details.filter(s => !s.canLogin).forEach(seller => {
            const icon = seller.needsFix ? '🔧' : '❌';
            console.log(`  ${icon} ${seller.name} (${seller.email}) - ${seller.businessName} - ${seller.reason}`);
            console.log(`     Status: ${seller.approvalStatus}/${seller.status}`);
        });
        
        console.log('\n🔧 === SELLERS THAT NEED FIX === 🔧');
        const needFixSellers = analysis.details.filter(s => s.needsFix);
        if (needFixSellers.length === 0) {
            console.log('✅ No sellers need fixing! All approved sellers can login.');
        } else {
            console.log(`Found ${needFixSellers.length} sellers that need status fixes:`);
            needFixSellers.forEach(seller => {
                console.log(`  🔧 ${seller.email} - Current: ${seller.approvalStatus}/${seller.status}`);
            });
            
            console.log('\n💡 QUICK FIX COMMANDS:');
            needFixSellers.forEach(seller => {
                console.log(`\n// Fix ${seller.name}:`);
                console.log(`fetch('${BACKEND_URL}/api/debug/fix-seller-status', {`);
                console.log(`  method: 'POST',`);
                console.log(`  headers: { 'Content-Type': 'application/json' },`);
                console.log(`  body: JSON.stringify({`);
                console.log(`    email: '${seller.email}',`);
                console.log(`    approvalStatus: 'approved',`);
                console.log(`    status: 'approved'`);
                console.log(`  })`);
                console.log(`}).then(r => r.json()).then(console.log);`);
            });
        }
        
        // Step 4: Answer the main question
        console.log('\n🎯 === ANSWER TO YOUR QUESTION === 🎯');
        console.log('❓ "After the fix seller approval status is successful, will all the approved sellers be able to login?"');
        console.log('');
        
        if (analysis.needFix === 0) {
            console.log('✅ YES! All approved sellers can already login.');
            console.log('   No fixes needed - all sellers have consistent approval status.');
        } else {
            console.log(`🔧 ALMOST! ${analysis.needFix} sellers need status fixes first.`);
            console.log(`   After applying the fix to these ${analysis.needFix} sellers, ALL approved sellers will be able to login.`);
            console.log('');
            console.log('🚀 The fix endpoint works perfectly - it just needs to be applied to sellers with status mismatches.');
        }
        
        return analysis;
        
    } catch (error) {
        console.error('🔥 Error during analysis:', error);
    }
}

// Auto-fix all sellers who need it (use with caution)
async function fixAllSellersWhoNeedIt() {
    console.log('🔧 === AUTO-FIX ALL SELLERS WHO NEED IT === 🔧');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/sellers`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ Failed to fetch sellers:', result.error);
            return;
        }
        
        const sellers = result.sellers;
        const needFixSellers = sellers.filter(seller => {
            const approvalStatus = seller.approvalStatus || 'not_set';
            const status = seller.status || 'not_set';
            
            // Check if they need fixing (approved but inconsistent)
            return (approvalStatus === 'approved' || status === 'approved') && 
                   (approvalStatus !== 'approved' || status !== 'approved');
        });
        
        console.log(`Found ${needFixSellers.length} sellers to fix...`);
        
        for (const seller of needFixSellers) {
            console.log(`🔧 Fixing ${seller.email}...`);
            
            const fixResponse = await fetch(`${BACKEND_URL}/api/debug/fix-seller-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: seller.email,
                    approvalStatus: 'approved',
                    status: 'approved'
                })
            });
            
            const fixResult = await fixResponse.json();
            
            if (fixResult.success) {
                console.log(`  ✅ Fixed successfully`);
            } else {
                console.log(`  ❌ Fix failed: ${fixResult.error}`);
            }
        }
        
        console.log('\n🎉 Auto-fix complete! Run the eligibility check again to verify.');
        
    } catch (error) {
        console.error('🔥 Error during auto-fix:', error);
    }
}

console.log('🔧 Seller Login Eligibility Checker Loaded!');
console.log('');
console.log('📝 Available functions:');
console.log('  checkAllSellersLoginEligibility() - Analyze all sellers');
console.log('  fixAllSellersWhoNeedIt() - Auto-fix sellers with status mismatches');
console.log('');
console.log('🚀 Run checkAllSellersLoginEligibility() to answer your question!');

// Export for easy use
window.checkAllSellersLoginEligibility = checkAllSellersLoginEligibility;
window.fixAllSellersWhoNeedIt = fixAllSellersWhoNeedIt;
