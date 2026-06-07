import dns from 'dns';

if (!global.__dns_patched__) {
  global.__dns_patched__ = true;
  const originalLookup = dns.lookup;
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '8.8.4.4']);

  dns.lookup = function(hostname, options, callback) {
    let actualCallback = callback;
    let actualOptions = options;
    if (typeof options === 'function') {
      actualCallback = options;
      actualOptions = {};
    }

    // Direct pass-through for local loopbacks and IP addresses
    if (
      !hostname ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    ) {
      return originalLookup(hostname, actualOptions, actualCallback);
    }

    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, actualOptions, actualCallback);
      }
      const ip = addresses[0];
      if (actualOptions.all) {
        return actualCallback(null, addresses.map(addr => ({ address: addr, family: 4 })));
      } else {
        return actualCallback(null, ip, 4);
      }
    });
  };
  console.log('[AssignAI DNS] Applied Global Google DNS lookup resolution hook (8.8.8.8).');
}
